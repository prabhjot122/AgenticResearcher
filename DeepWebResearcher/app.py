from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
import uuid
import threading
from datetime import datetime
import sqlite3
import json
import os
from werkzeug.utils import secure_filename
from draftagent import conduct_research_workflow, select_content_style
from rag import get_rag_pipeline

# Load environment variables from .env file
from dotenv import load_dotenv
load_dotenv()

# Set the HuggingFace API token if not already set
if not os.getenv("HUGGINGFACEHUB_API_TOKEN"):
    os.environ["HUGGINGFACEHUB_API_TOKEN"] = "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"

app = Flask(__name__)
CORS(app)  # Enable CORS for all routes

# Database configuration
DB_FILE = "research_database.sqlite"

# Upload folder for PDFs
UPLOAD_FOLDER = 'uploads'
ALLOWED_EXTENSIONS = {'pdf'}
if not os.path.exists(UPLOAD_FOLDER):
    os.makedirs(UPLOAD_FOLDER)
app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER

# Dictionary to store research results by ID (in-memory cache)
research_results = {}

# Dictionary to store PDF metadata and paths
pdf_library = {}

def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

# Initialize database
def init_db():
    """Initialize the SQLite database with required tables"""
    conn = sqlite3.connect(DB_FILE)
    cursor = conn.cursor()

    # Create tables if they don't exist
    cursor.execute('''
    CREATE TABLE IF NOT EXISTS drafts (
        draft_id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        tags TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT,
        research_id TEXT,
        query TEXT,
        content_style TEXT,
        draft_content TEXT,
        reference_list TEXT
    )
    ''')

    cursor.execute('''
    CREATE TABLE IF NOT EXISTS playlists (
        playlist_id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        description TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT
    )
    ''')

    cursor.execute('''
    CREATE TABLE IF NOT EXISTS playlist_drafts (
        playlist_id TEXT,
        draft_id TEXT,
        added_at TEXT NOT NULL,
        PRIMARY KEY (playlist_id, draft_id),
        FOREIGN KEY (playlist_id) REFERENCES playlists(playlist_id) ON DELETE CASCADE,
        FOREIGN KEY (draft_id) REFERENCES drafts(draft_id) ON DELETE CASCADE
    )
    ''')

    # New table for PDF documents
    cursor.execute('''
    CREATE TABLE IF NOT EXISTS pdf_documents (
        pdf_id TEXT PRIMARY KEY,
        filename TEXT NOT NULL,
        title TEXT,
        description TEXT,
        file_path TEXT NOT NULL,
        uploaded_at TEXT NOT NULL,
        tags TEXT,
        metadata TEXT
    )
    ''')

    # New table for research-PDF associations
    cursor.execute('''
    CREATE TABLE IF NOT EXISTS research_pdfs (
        research_id TEXT,
        pdf_id TEXT,
        PRIMARY KEY (research_id, pdf_id),
        FOREIGN KEY (pdf_id) REFERENCES pdf_documents(pdf_id) ON DELETE CASCADE
    )
    ''')

    # Enable foreign key support
    cursor.execute("PRAGMA foreign_keys = ON")

    conn.commit()
    conn.close()

    print(f"Database initialized: {DB_FILE}")

def get_db_connection():
    """Get a database connection with foreign key support enabled"""
    conn = sqlite3.connect(DB_FILE)
    conn.row_factory = sqlite3.Row  # Return rows as dictionaries
    conn.execute("PRAGMA foreign_keys = ON")
    return conn

def process_research_in_background(research_id, query, content_style, pdf_ids=None):
    """Background task to process research request with optional PDF context"""
    try:
        print("\n" + "="*50)
        print(f"PROCESSING RESEARCH: {research_id}")
        print("="*50)
        print(f"Query: {query}")
        print(f"Content Style: {content_style}")
        if pdf_ids:
            print(f"Using PDFs: {pdf_ids}")
        print("-"*50)

        # Update status to processing
        research_results[research_id]["status"] = "processing"
        research_results[research_id]["processing_started"] = datetime.now().isoformat()

        # Get PDF context if PDF IDs are provided
        pdf_context = ""
        if pdf_ids and len(pdf_ids) > 0:
            rag_pipeline = get_rag_pipeline()

            # Store PDF-research association in database
            conn = get_db_connection()
            cursor = conn.cursor()

            try:
                for pdf_id in pdf_ids:
                    # Get PDF file path from database
                    cursor.execute('SELECT file_path FROM pdf_documents WHERE pdf_id = ?', (pdf_id,))
                    pdf_row = cursor.fetchone()

                    if pdf_row:
                        # Add to research_pdfs table
                        cursor.execute(
                            'INSERT OR IGNORE INTO research_pdfs (research_id, pdf_id) VALUES (?, ?)',
                            (research_id, pdf_id)
                        )

                conn.commit()

                # Get relevant context from the vector store
                pdf_context = rag_pipeline.get_relevant_context(query)
                print(f"Retrieved {len(pdf_context)} characters of PDF context")

            except Exception as e:
                print(f"Error processing PDF context: {str(e)}")
            finally:
                conn.close()

        # Conduct the research with PDF context
        result = conduct_research_workflow(query, content_style, pdf_context)

        # Update the research results with the complete data
        research_results[research_id].update(result)
        research_results[research_id]["status"] = "completed"
        research_results[research_id]["completed_at"] = datetime.now().isoformat()

        print("\n" + "="*50)
        print(f"RESEARCH COMPLETED: {research_id}")
        print("="*50)
    except Exception as e:
        print(f"ERROR in research {research_id}: {str(e)}")
        research_results[research_id]["status"] = "error"
        research_results[research_id]["error"] = str(e)
        research_results[research_id]["error_at"] = datetime.now().isoformat()

@app.route('/research/start', methods=['POST'])
def start_research():
    """
    Endpoint to initiate research based on query and content style

    Expected JSON body:
    {
        "query": "Your research query",
        "style": 1,  # 1=blog post, 2=detailed report, 3=executive summary
        "pdf_ids": ["pdf-id-1", "pdf-id-2"]  # Optional
    }
    """
    data = request.json
    if not data:
        return jsonify({"error": "Request body must be JSON"}), 400

    query = data.get('query')
    style_number = data.get('style', 1)
    pdf_ids = data.get('pdf_ids', [])

    if not query:
        return jsonify({"error": "Missing required parameter: query"}), 400

    try:
        style_number = int(style_number)
        if style_number not in [1, 2, 3]:
            return jsonify({"error": "Style number must be between 1 and 3"}), 400
    except ValueError:
        return jsonify({"error": "Style number must be an integer"}), 400

    # Validate PDF IDs if provided
    if pdf_ids:
        conn = get_db_connection()
        cursor = conn.cursor()

        try:
            placeholders = ','.join(['?'] * len(pdf_ids))
            cursor.execute(f'SELECT pdf_id FROM pdf_documents WHERE pdf_id IN ({placeholders})', pdf_ids)
            valid_pdf_ids = [row['pdf_id'] for row in cursor.fetchall()]

            invalid_pdfs = [pdf_id for pdf_id in pdf_ids if pdf_id not in valid_pdf_ids]
            if invalid_pdfs:
                return jsonify({
                    "error": "Some PDF IDs are invalid",
                    "invalid_pdfs": invalid_pdfs
                }), 400

            # Use only valid PDF IDs
            pdf_ids = valid_pdf_ids
        except Exception as e:
            return jsonify({"error": f"Database error: {str(e)}"}), 500
        finally:
            conn.close()

    content_style = select_content_style(style_number)

    # Generate a unique ID for this research
    research_id = str(uuid.uuid4())

    # Initialize the research results with status information
    research_results[research_id] = {
        "query": query,
        "content_style": content_style,
        "status": "queued",
        "created_at": datetime.now().isoformat(),
        "optimized_query": "",
        "research_output": "",
        "claims": [],
        "verification_results": [],
        "references": [],
        "fact_check_report": "",
        "draft_content": "",
        "pdf_ids": pdf_ids
    }

    # Start the research in a background thread
    thread = threading.Thread(
        target=process_research_in_background,
        args=(research_id, query, content_style, pdf_ids)
    )
    thread.daemon = True
    thread.start()

    # Return the research ID and initial status immediately
    return jsonify({
        "status": "success",
        "message": "Research initiated successfully",
        "research_id": research_id,
        "research_status": "queued",
        "created_at": research_results[research_id]["created_at"],
        "pdf_count": len(pdf_ids) if pdf_ids else 0
    })

@app.route('/research/results/<research_id>', methods=['GET'])
def get_research_results(research_id):
    """
    Endpoint to get all research results for a given research ID
    """
    if research_id not in research_results:
        return jsonify({"error": "Research ID not found"}), 404

    result = research_results[research_id]
    status = result.get("status", "unknown")

    # If research is not completed yet
    if status in ["queued", "processing"]:
        return jsonify({
            "research_id": research_id,
            "status": status,
            "message": "Research is still in progress",
            "created_at": result.get("created_at", ""),
            "processing_started": result.get("processing_started", ""),
            "query": result.get("query", ""),
            "content_style": result.get("content_style", ""),
            "pdf_ids": result.get("pdf_ids", [])
        })

    # If there was an error
    if status == "error":
        return jsonify({
            "research_id": research_id,
            "status": "error",
            "message": "An error occurred during research",
            "error": result.get("error", "Unknown error"),
            "created_at": result.get("created_at", ""),
            "error_at": result.get("error_at", ""),
            "query": result.get("query", ""),
            "content_style": result.get("content_style", ""),
            "pdf_ids": result.get("pdf_ids", [])
        })

    # Format the response to include all components for completed research
    response = {
        "research_id": research_id,
        "status": status,
        "created_at": result.get("created_at", ""),
        "completed_at": result.get("completed_at", ""),
        "query": {
            "original": result.get("query", ""),
            "optimized": result.get("optimized_query", "")
        },
        "research_output": result.get("research_output", ""),
        "fact_check": {
            "report": result.get("fact_check_report", ""),
            "verification_results": result.get("verification_results", [])
        },
        "content": {
            "style": result.get("content_style", ""),
            "draft": result.get("draft_content", "")
        },
        "references": result.get("references", []),
        "pdf_ids": result.get("pdf_ids", [])
    }

    return jsonify(response)

# PDF Management APIs

@app.route('/pdfs/upload', methods=['POST'])
def upload_pdf():
    """
    Endpoint to upload a PDF file
    """
    # Check if the post request has the file part
    if 'file' not in request.files:
        return jsonify({"error": "No file part"}), 400

    file = request.files['file']

    # If user does not select file, browser also
    # submit an empty part without filename
    if file.filename == '':
        return jsonify({"error": "No selected file"}), 400

    if file and allowed_file(file.filename):
        # Generate a unique ID for this PDF
        pdf_id = str(uuid.uuid4())

        # Secure the filename
        filename = secure_filename(file.filename)

        # Create a unique filename to avoid collisions
        unique_filename = f"{pdf_id}_{filename}"
        file_path = os.path.join(app.config['UPLOAD_FOLDER'], unique_filename)

        # Save the file
        file.save(file_path)

        # Get metadata from form data
        title = request.form.get('title', filename)
        description = request.form.get('description', '')
        tags = request.form.get('tags', '[]')  # JSON string of tags

        try:
            tags_list = json.loads(tags)
            if not isinstance(tags_list, list):
                tags_list = []
        except json.JSONDecodeError:
            tags_list = []

        # Current timestamp
        now = datetime.now().isoformat()

        # Connect to database
        conn = get_db_connection()
        cursor = conn.cursor()

        try:
            # Insert PDF info into database
            cursor.execute('''
            INSERT INTO pdf_documents (
                pdf_id, filename, title, description, file_path, uploaded_at, tags, metadata
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            ''', (
                pdf_id,
                filename,
                title,
                description,
                file_path,
                now,
                json.dumps(tags_list),
                json.dumps({"original_filename": filename})
            ))

            conn.commit()

            # Process the PDF with the RAG pipeline if available
            try:
                rag_pipeline = get_rag_pipeline()
                if rag_pipeline:
                    chunk_count = rag_pipeline.process_pdf(file_path, {"pdf_id": pdf_id, "title": title})

                    # Update metadata with chunk count
                    cursor.execute('''
                    UPDATE pdf_documents
                    SET metadata = ?
                    WHERE pdf_id = ?
                    ''', (
                        json.dumps({
                            "original_filename": filename,
                            "chunk_count": chunk_count
                        }),
                        pdf_id
                    ))

                    conn.commit()

                    return jsonify({
                        "status": "success",
                        "message": "PDF uploaded and processed successfully",
                        "pdf_id": pdf_id,
                        "title": title,
                        "chunk_count": chunk_count
                    })
                else:
                    # RAG pipeline not available, just upload the file
                    return jsonify({
                        "status": "success",
                        "message": "PDF uploaded successfully (RAG processing disabled)",
                        "pdf_id": pdf_id,
                        "title": title,
                        "note": "PDF content indexing is disabled. Configure MISTRAL_API_KEY, QDRANT_API_KEY, and QDRANT_URL to enable full PDF processing."
                    })

            except Exception as e:
                return jsonify({
                    "status": "partial_success",
                    "message": f"PDF uploaded but processing failed: {str(e)}",
                    "pdf_id": pdf_id,
                    "title": title
                })

        except Exception as e:
            conn.rollback()
            return jsonify({"error": f"Database error: {str(e)}"}), 500
        finally:
            conn.close()

    return jsonify({"error": "Invalid file type. Only PDF files are allowed."}), 400

@app.route('/pdfs', methods=['GET'])
def get_all_pdfs():
    """
    Endpoint to get all PDFs in the library

    Query parameters:
    - tag: Filter PDFs by tag (optional)
    """
    tag_filter = request.args.get('tag')

    conn = get_db_connection()
    cursor = conn.cursor()

    try:
        if tag_filter:
            # SQLite doesn't have native JSON functions, so we'll filter in Python
            cursor.execute('SELECT * FROM pdf_documents ORDER BY uploaded_at DESC')
            rows = cursor.fetchall()

            # Convert rows to dictionaries and filter by tag
            pdfs_list = []
            for row in rows:
                pdf = dict(row)
                tags = json.loads(pdf['tags'] or '[]')
                pdf['tags'] = tags
                pdf['metadata'] = json.loads(pdf['metadata'] or '{}')

                if tag_filter in tags:
                    pdfs_list.append(pdf)
        else:
            # Get all PDFs
            cursor.execute('SELECT * FROM pdf_documents ORDER BY uploaded_at DESC')
            rows = cursor.fetchall()

            # Convert rows to dictionaries
            pdfs_list = []
            for row in rows:
                pdf = dict(row)
                pdf['tags'] = json.loads(pdf['tags'] or '[]')
                pdf['metadata'] = json.loads(pdf['metadata'] or '{}')
                pdfs_list.append(pdf)

        return jsonify({
            "count": len(pdfs_list),
            "pdfs": pdfs_list
        })
    except Exception as e:
        return jsonify({"error": f"Database error: {str(e)}"}), 500
    finally:
        conn.close()

@app.route('/pdfs/<pdf_id>', methods=['GET'])
def get_pdf_by_id(pdf_id):
    """
    Endpoint to get a specific PDF by ID
    """
    conn = get_db_connection()
    cursor = conn.cursor()

    try:
        cursor.execute('SELECT * FROM pdf_documents WHERE pdf_id = ?', (pdf_id,))
        row = cursor.fetchone()

        if not row:
            return jsonify({"error": "PDF ID not found"}), 404

        pdf = dict(row)
        pdf['tags'] = json.loads(pdf['tags'] or '[]')
        pdf['metadata'] = json.loads(pdf['metadata'] or '{}')

        return jsonify(pdf)
    except Exception as e:
        return jsonify({"error": f"Database error: {str(e)}"}), 500
    finally:
        conn.close()

@app.route('/pdfs/<pdf_id>/download', methods=['GET'])
def download_pdf(pdf_id):
    """
    Endpoint to download a PDF file
    """
    conn = get_db_connection()
    cursor = conn.cursor()

    try:
        cursor.execute('SELECT file_path, filename FROM pdf_documents WHERE pdf_id = ?', (pdf_id,))
        row = cursor.fetchone()

        if not row:
            return jsonify({"error": "PDF ID not found"}), 404

        file_path = row['file_path']
        original_filename = row['filename']

        # Check if file exists
        if not os.path.exists(file_path):
            return jsonify({"error": "PDF file not found on server"}), 404

        # Get directory and filename from path
        directory = os.path.dirname(file_path)
        filename = os.path.basename(file_path)

        return send_from_directory(
            directory,
            filename,
            as_attachment=True,
            download_name=original_filename
        )
    except Exception as e:
        return jsonify({"error": f"Error downloading PDF: {str(e)}"}), 500
    finally:
        conn.close()

@app.route('/pdfs/<pdf_id>', methods=['DELETE'])
def delete_pdf(pdf_id):
    """
    Endpoint to delete a PDF from the library
    """
    conn = get_db_connection()
    cursor = conn.cursor()

    try:
        # Get file path before deleting
        cursor.execute('SELECT file_path FROM pdf_documents WHERE pdf_id = ?', (pdf_id,))
        row = cursor.fetchone()

        if not row:
            return jsonify({"error": "PDF ID not found"}), 404

        file_path = row['file_path']

        # Begin transaction
        conn.execute('BEGIN TRANSACTION')

        # Delete from database
        cursor.execute('DELETE FROM pdf_documents WHERE pdf_id = ?', (pdf_id,))

        # Commit transaction
        conn.commit()

        # Delete file from disk
        if os.path.exists(file_path):
            os.remove(file_path)

        return jsonify({
            "status": "success",
            "message": "PDF deleted successfully"
        })
    except Exception as e:
        conn.rollback()
        return jsonify({"error": f"Error deleting PDF: {str(e)}"}), 500
    finally:
        conn.close()

@app.route('/pdfs/<pdf_id>', methods=['PUT'])
def update_pdf_metadata(pdf_id):
    """
    Endpoint to update PDF metadata

    Expected JSON body:
    {
        "title": "Updated title",
        "description": "Updated description",
        "tags": ["tag1", "tag2"]
    }
    """
    data = request.json
    if not data:
        return jsonify({"error": "Request body must be JSON"}), 400

    conn = get_db_connection()
    cursor = conn.cursor()

    try:
        # Check if PDF exists
        cursor.execute('SELECT pdf_id FROM pdf_documents WHERE pdf_id = ?', (pdf_id,))
        if not cursor.fetchone():
            return jsonify({"error": "PDF ID not found"}), 404

        # Begin transaction
        conn.execute('BEGIN TRANSACTION')

        # Update fields
        updates = []
        params = []

        if 'title' in data:
            updates.append("title = ?")
            params.append(data['title'])

        if 'description' in data:
            updates.append("description = ?")
            params.append(data['description'])

        if 'tags' in data:
            updates.append("tags = ?")
            params.append(json.dumps(data['tags']))

        # Add pdf_id to params
        params.append(pdf_id)

        # Execute update
        if updates:
            query = f"UPDATE pdf_documents SET {', '.join(updates)} WHERE pdf_id = ?"
            cursor.execute(query, params)

        # Commit transaction
        conn.commit()

        # Get updated PDF
        cursor.execute('SELECT * FROM pdf_documents WHERE pdf_id = ?', (pdf_id,))
        updated_pdf = dict(cursor.fetchone())
        updated_pdf['tags'] = json.loads(updated_pdf['tags'] or '[]')
        updated_pdf['metadata'] = json.loads(updated_pdf['metadata'] or '{}')

        return jsonify({
            "status": "success",
            "message": "PDF metadata updated successfully",
            "pdf": updated_pdf
        })
    except Exception as e:
        conn.rollback()
        return jsonify({"error": f"Database error: {str(e)}"}), 500
    finally:
        conn.close()

@app.route('/research/<research_id>/pdfs', methods=['GET'])
def get_research_pdfs(research_id):
    """
    Endpoint to get all PDFs associated with a research
    """
    conn = get_db_connection()
    cursor = conn.cursor()

    try:
        # Check if research exists
        if research_id not in research_results:
            return jsonify({"error": "Research ID not found"}), 404

        # Get PDFs associated with the research
        cursor.execute('''
        SELECT p.* FROM pdf_documents p
        JOIN research_pdfs rp ON p.pdf_id = rp.pdf_id
        WHERE rp.research_id = ?
        ORDER BY p.uploaded_at DESC
        ''', (research_id,))

        rows = cursor.fetchall()

        # Convert rows to dictionaries
        pdfs_list = []
        for row in rows:
            pdf = dict(row)
            pdf['tags'] = json.loads(pdf['tags'] or '[]')
            pdf['metadata'] = json.loads(pdf['metadata'] or '{}')
            pdfs_list.append(pdf)

        return jsonify({
            "research_id": research_id,
            "count": len(pdfs_list),
            "pdfs": pdfs_list
        })
    except Exception as e:
        return jsonify({"error": f"Database error: {str(e)}"}), 500
    finally:
        conn.close()

@app.route('/query-pdf', methods=['POST'])
def query_pdf_directly():
    """
    Endpoint to directly query the PDF knowledge base

    Expected JSON body:
    {
        "query": "Your question about the PDFs",
        "pdf_ids": ["pdf-id-1", "pdf-id-2"]  # Optional, if not provided, query all PDFs
    }
    """
    data = request.json
    if not data:
        return jsonify({"error": "Request body must be JSON"}), 400

    query = data.get('query')
    pdf_ids = data.get('pdf_ids', [])

    if not query:
        return jsonify({"error": "Missing required parameter: query"}), 400

    try:
        rag_pipeline = get_rag_pipeline()

        # If specific PDF IDs are provided, we could filter results
        # but for now we'll just query the entire vector store
        result = rag_pipeline.query(query)

        return jsonify({
            "status": "success",
            "query": query,
            "answer": result["answer"],
            "sources": [doc["metadata"] for doc in result["documents"]]
        })
    except Exception as e:
        return jsonify({"error": f"Error querying PDFs: {str(e)}"}), 500

# Library management APIs with SQLite

@app.route('/library/save-draft', methods=['POST'])
def save_draft_to_library():
    """
    Endpoint to save a draft to the library

    Expected JSON body:
    {
        "research_id": "uuid-of-research",
        "title": "Custom title for the draft",
        "tags": ["tag1", "tag2"],  # Optional
        "content": "Custom content"  # Optional
    }
    """
    data = request.json
    if not data:
        return jsonify({"error": "Request body must be JSON"}), 400

    research_id = data.get('research_id')
    title = data.get('title')
    tags = data.get('tags', [])
    custom_content = data.get('content')  # Get optional content

    if not research_id:
        return jsonify({"error": "Missing required parameter: research_id"}), 400
    if not title:
        return jsonify({"error": "Missing required parameter: title"}), 400

    # Check if research exists and is completed
    if research_id not in research_results:
        return jsonify({"error": "Research ID not found"}), 404

    result = research_results[research_id]
    if result.get("status") != "completed":
        return jsonify({"error": "Research is not completed yet"}), 400

    # Generate a unique ID for this draft
    draft_id = str(uuid.uuid4())

    # Current timestamp
    now = datetime.now().isoformat()

    # Connect to database
    conn = get_db_connection()
    cursor = conn.cursor()

    try:
        # Use custom content if provided, otherwise use the original research content
        draft_content = custom_content if custom_content is not None else result.get("draft_content", "")

        # Insert draft into database
        cursor.execute('''
        INSERT INTO drafts (
            draft_id, title, tags, created_at, updated_at, research_id,
            query, content_style, draft_content, reference_list
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ''', (
            draft_id,
            title,
            json.dumps(tags),
            now,
            now,
            research_id,
            result.get("query", ""),
            result.get("content_style", ""),
            draft_content,
            json.dumps(result.get("references", []))
        ))

        conn.commit()

        return jsonify({
            "status": "success",
            "message": "Draft saved to library successfully",
            "draft_id": draft_id
        })
    except Exception as e:
        conn.rollback()
        return jsonify({"error": f"Database error: {str(e)}"}), 500
    finally:
        conn.close()

@app.route('/library/save-copy', methods=['POST'])
def save_draft_copy():
    """
    Endpoint to save a copy of a draft with edited content

    Expected JSON body:
    {
        "title": "Custom title for the draft",
        "content": "Edited content of the draft",
        "content_style": "blog post",
        "tags": ["tag1", "tag2"],  # Optional
        "references": ["ref1", "ref2"]  # Optional
    }
    """
    data = request.json
    if not data:
        return jsonify({"error": "Request body must be JSON"}), 400

    title = data.get('title')
    content = data.get('content', '')
    content_style = data.get('content_style', 'blog post')
    tags = data.get('tags', [])
    references = data.get('references', [])

    if not title:
        return jsonify({"error": "Missing required parameter: title"}), 400

    # Generate a unique ID for this draft
    draft_id = str(uuid.uuid4())

    # Current timestamp
    now = datetime.now().isoformat()

    # Connect to database
    conn = get_db_connection()
    cursor = conn.cursor()

    try:
        # Insert draft into database
        cursor.execute('''
        INSERT INTO drafts (
            draft_id, title, tags, created_at, updated_at,
            content_style, draft_content, reference_list
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        ''', (
            draft_id,
            title,
            json.dumps(tags),
            now,
            now,
            content_style,
            content,
            json.dumps(references)
        ))

        conn.commit()

        return jsonify({
            "status": "success",
            "message": "Draft copy saved to library successfully",
            "draft_id": draft_id
        })
    except Exception as e:
        conn.rollback()
        return jsonify({"error": f"Database error: {str(e)}"}), 500
    finally:
        conn.close()

@app.route('/library/drafts', methods=['GET'])
def get_all_drafts():
    """
    Endpoint to get all drafts in the library

    Query parameters:
    - tag: Filter drafts by tag (optional)
    """
    tag_filter = request.args.get('tag')

    conn = get_db_connection()
    cursor = conn.cursor()

    try:
        if tag_filter:
            # SQLite doesn't have native JSON functions, so we'll filter in Python
            cursor.execute('SELECT * FROM drafts ORDER BY created_at DESC')
            rows = cursor.fetchall()

            # Convert rows to dictionaries and filter by tag
            drafts_list = []
            for row in rows:
                draft = dict(row)
                tags = json.loads(draft['tags'] or '[]')
                draft['tags'] = tags
                draft['references'] = json.loads(draft['reference_list'] or '[]')

                if tag_filter in tags:
                    drafts_list.append(draft)
        else:
            # Get all drafts
            cursor.execute('SELECT * FROM drafts ORDER BY created_at DESC')
            rows = cursor.fetchall()

            # Convert rows to dictionaries
            drafts_list = []
            for row in rows:
                draft = dict(row)
                draft['tags'] = json.loads(draft['tags'] or '[]')
                draft['references'] = json.loads(draft['reference_list'] or '[]')
                drafts_list.append(draft)

        return jsonify({
            "count": len(drafts_list),
            "drafts": drafts_list
        })
    except Exception as e:
        return jsonify({"error": f"Database error: {str(e)}"}), 500
    finally:
        conn.close()

@app.route('/library/drafts/<draft_id>', methods=['GET'])
def get_draft_by_id(draft_id):
    """
    Endpoint to get a specific draft by ID
    """
    conn = get_db_connection()
    cursor = conn.cursor()

    try:
        cursor.execute('SELECT * FROM drafts WHERE draft_id = ?', (draft_id,))
        row = cursor.fetchone()

        if not row:
            return jsonify({"error": "Draft ID not found"}), 404

        draft = dict(row)
        draft['tags'] = json.loads(draft['tags'] or '[]')
        draft['references'] = json.loads(draft['reference_list'] or '[]')

        return jsonify(draft)
    except Exception as e:
        return jsonify({"error": f"Database error: {str(e)}"}), 500
    finally:
        conn.close()

@app.route('/library/playlists', methods=['GET'])
def get_all_playlists():
    """
    Endpoint to get all playlists
    """
    conn = get_db_connection()
    cursor = conn.cursor()

    try:
        # Get all playlists
        cursor.execute('''
        SELECT p.*, COUNT(pd.draft_id) as draft_count
        FROM playlists p
        LEFT JOIN playlist_drafts pd ON p.playlist_id = pd.playlist_id
        GROUP BY p.playlist_id
        ORDER BY p.created_at DESC
        ''')

        playlists_list = [dict(row) for row in cursor.fetchall()]

        return jsonify({
            "count": len(playlists_list),
            "playlists": playlists_list
        })
    except Exception as e:
        return jsonify({"error": f"Database error: {str(e)}"}), 500
    finally:
        conn.close()

@app.route('/library/playlists', methods=['POST'])
def create_playlist():
    """
    Endpoint to create a new playlist

    Expected JSON body:
    {
        "name": "Playlist name",
        "description": "Playlist description",
        "draft_ids": ["draft-id-1", "draft-id-2"]  # Optional
    }
    """
    data = request.json
    if not data:
        return jsonify({"error": "Request body must be JSON"}), 400

    name = data.get('name')
    description = data.get('description', '')
    draft_ids = data.get('draft_ids', [])

    if not name:
        return jsonify({"error": "Missing required parameter: name"}), 400

    # Generate a unique ID for this playlist
    playlist_id = str(uuid.uuid4())
    now = datetime.now().isoformat()

    conn = get_db_connection()
    cursor = conn.cursor()

    try:
        # Validate draft IDs
        if draft_ids:
            placeholders = ','.join(['?'] * len(draft_ids))
            cursor.execute(f'SELECT draft_id FROM drafts WHERE draft_id IN ({placeholders})', draft_ids)
            valid_draft_ids = [row['draft_id'] for row in cursor.fetchall()]

            invalid_drafts = [draft_id for draft_id in draft_ids if draft_id not in valid_draft_ids]
            if invalid_drafts:
                return jsonify({
                    "error": "Some draft IDs are invalid",
                    "invalid_drafts": invalid_drafts
                }), 400

        # Begin transaction
        conn.execute('BEGIN TRANSACTION')

        # Create playlist
        cursor.execute('''
        INSERT INTO playlists (playlist_id, name, description, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?)
        ''', (playlist_id, name, description, now, now))

        # Add drafts to playlist if provided
        if draft_ids:
            for draft_id in draft_ids:
                cursor.execute('''
                INSERT INTO playlist_drafts (playlist_id, draft_id, added_at)
                VALUES (?, ?, ?)
                ''', (playlist_id, draft_id, now))

        # Commit transaction
        conn.commit()

        return jsonify({
            "status": "success",
            "message": "Playlist created successfully",
            "playlist_id": playlist_id
        })
    except Exception as e:
        conn.rollback()
        return jsonify({"error": f"Database error: {str(e)}"}), 500
    finally:
        conn.close()

@app.route('/library/playlists/<playlist_id>', methods=['GET'])
def get_playlist_by_id(playlist_id):
    """
    Endpoint to get a specific playlist with its drafts
    """
    conn = get_db_connection()
    cursor = conn.cursor()

    try:
        # Get playlist info
        cursor.execute('SELECT * FROM playlists WHERE playlist_id = ?', (playlist_id,))
        playlist = cursor.fetchone()

        if not playlist:
            return jsonify({"error": "Playlist ID not found"}), 404

        playlist_dict = dict(playlist)

        # Get drafts in this playlist
        cursor.execute('''
        SELECT d.*, pd.added_at
        FROM drafts d
        JOIN playlist_drafts pd ON d.draft_id = pd.draft_id
        WHERE pd.playlist_id = ?
        ORDER BY pd.added_at DESC
        ''', (playlist_id,))

        drafts = []
        for row in cursor.fetchall():
            draft = dict(row)
            draft['tags'] = json.loads(draft['tags'] or '[]')
            draft['references'] = json.loads(draft['reference_list'] or '[]')
            drafts.append(draft)

        response = {
            "playlist_id": playlist_dict["playlist_id"],
            "name": playlist_dict["name"],
            "description": playlist_dict["description"],
            "created_at": playlist_dict["created_at"],
            "updated_at": playlist_dict["updated_at"],
            "draft_count": len(drafts),
            "drafts": drafts
        }

        return jsonify(response)
    except Exception as e:
        return jsonify({"error": f"Database error: {str(e)}"}), 500
    finally:
        conn.close()

@app.route('/library/playlists/<playlist_id>/drafts', methods=['POST'])
def add_drafts_to_playlist(playlist_id):
    """
    Endpoint to add drafts to a playlist

    Expected JSON body:
    {
        "draft_ids": ["draft-id-1", "draft-id-2"]
    }
    """
    conn = get_db_connection()
    cursor = conn.cursor()

    try:
        # Check if playlist exists
        cursor.execute('SELECT playlist_id FROM playlists WHERE playlist_id = ?', (playlist_id,))
        if not cursor.fetchone():
            return jsonify({"error": "Playlist ID not found"}), 404

        data = request.json
        if not data:
            return jsonify({"error": "Request body must be JSON"}), 400

        draft_ids = data.get('draft_ids', [])
        if not draft_ids:
            return jsonify({"error": "Missing required parameter: draft_ids"}), 400

        # Validate draft IDs
        placeholders = ','.join(['?'] * len(draft_ids))
        cursor.execute(f'SELECT draft_id FROM drafts WHERE draft_id IN ({placeholders})', draft_ids)
        valid_draft_ids = [row['draft_id'] for row in cursor.fetchall()]

        invalid_drafts = [draft_id for draft_id in draft_ids if draft_id not in valid_draft_ids]
        if invalid_drafts:
            return jsonify({
                "error": "Some draft IDs are invalid",
                "invalid_drafts": invalid_drafts
            }), 400

        # Begin transaction
        conn.execute('BEGIN TRANSACTION')

        # Get existing drafts in playlist
        cursor.execute('SELECT draft_id FROM playlist_drafts WHERE playlist_id = ?', (playlist_id,))
        existing_draft_ids = [row['draft_id'] for row in cursor.fetchall()]

        # Add new drafts (avoiding duplicates)
        now = datetime.now().isoformat()
        added_count = 0

        for draft_id in draft_ids:
            if draft_id not in existing_draft_ids:
                cursor.execute('''
                INSERT INTO playlist_drafts (playlist_id, draft_id, added_at)
                VALUES (?, ?, ?)
                ''', (playlist_id, draft_id, now))
                added_count += 1

        # Update playlist updated_at timestamp
        cursor.execute('''
        UPDATE playlists SET updated_at = ? WHERE playlist_id = ?
        ''', (now, playlist_id))

        # Commit transaction
        conn.commit()

        # Get new total count
        cursor.execute('SELECT COUNT(*) as count FROM playlist_drafts WHERE playlist_id = ?', (playlist_id,))
        total_count = cursor.fetchone()['count']

        return jsonify({
            "status": "success",
            "message": f"Added {added_count} drafts to playlist",
            "playlist_id": playlist_id,
            "draft_count": total_count
        })
    except Exception as e:
        conn.rollback()
        return jsonify({"error": f"Database error: {str(e)}"}), 500
    finally:
        conn.close()

@app.route('/library/playlists/<playlist_id>/drafts/<draft_id>', methods=['DELETE'])
def remove_draft_from_playlist(playlist_id, draft_id):
    """
    Endpoint to remove a draft from a playlist
    """
    conn = get_db_connection()
    cursor = conn.cursor()

    try:
        # Check if the draft is in the playlist
        cursor.execute('''
        SELECT * FROM playlist_drafts
        WHERE playlist_id = ? AND draft_id = ?
        ''', (playlist_id, draft_id))

        if not cursor.fetchone():
            return jsonify({"error": "Draft is not in this playlist"}), 404

        # Begin transaction
        conn.execute('BEGIN TRANSACTION')

        # Remove the draft from the playlist
        cursor.execute('''
        DELETE FROM playlist_drafts
        WHERE playlist_id = ? AND draft_id = ?
        ''', (playlist_id, draft_id))

        # Update playlist updated_at timestamp
        now = datetime.now().isoformat()
        cursor.execute('''
        UPDATE playlists SET updated_at = ? WHERE playlist_id = ?
        ''', (now, playlist_id))

        # Get new total count
        cursor.execute('SELECT COUNT(*) as count FROM playlist_drafts WHERE playlist_id = ?', (playlist_id,))
        total_count = cursor.fetchone()['count']

        # Commit transaction
        conn.commit()

        return jsonify({
            "status": "success",
            "message": "Draft removed from playlist",
            "playlist_id": playlist_id,
            "draft_count": total_count
        })
    except Exception as e:
        conn.rollback()
        return jsonify({"error": f"Database error: {str(e)}"}), 500
    finally:
        conn.close()

@app.route('/library/playlists/<playlist_id>', methods=['DELETE'])
def delete_playlist(playlist_id):
    """
    Endpoint to delete a playlist
    """
    conn = get_db_connection()
    cursor = conn.cursor()

    try:
        # Check if playlist exists
        cursor.execute('SELECT playlist_id FROM playlists WHERE playlist_id = ?', (playlist_id,))
        if not cursor.fetchone():
            return jsonify({"error": "Playlist ID not found"}), 404

        # Begin transaction
        conn.execute('BEGIN TRANSACTION')

        # Delete playlist (cascade will delete playlist_drafts entries)
        cursor.execute('DELETE FROM playlists WHERE playlist_id = ?', (playlist_id,))

        # Commit transaction
        conn.commit()

        return jsonify({
            "status": "success",
            "message": "Playlist deleted successfully"
        })
    except Exception as e:
        conn.rollback()
        return jsonify({"error": f"Database error: {str(e)}"}), 500
    finally:
        conn.close()

@app.route('/library/drafts/<draft_id>', methods=['DELETE'])
def delete_draft(draft_id):
    """
    Endpoint to delete a draft from the library
    """
    conn = get_db_connection()
    cursor = conn.cursor()

    try:
        # Check if draft exists
        cursor.execute('SELECT draft_id FROM drafts WHERE draft_id = ?', (draft_id,))
        if not cursor.fetchone():
            return jsonify({"error": "Draft ID not found"}), 404

        # Begin transaction
        conn.execute('BEGIN TRANSACTION')

        # Delete draft (cascade will delete from playlist_drafts)
        cursor.execute('DELETE FROM drafts WHERE draft_id = ?', (draft_id,))

        # Commit transaction
        conn.commit()

        return jsonify({
            "status": "success",
            "message": "Draft deleted successfully"
        })
    except Exception as e:
        conn.rollback()
        return jsonify({"error": f"Database error: {str(e)}"}), 500
    finally:
        conn.close()

@app.route('/library/drafts/<draft_id>', methods=['PUT'])
def update_draft(draft_id):
    """
    Endpoint to update a draft's metadata

    Expected JSON body:
    {
        "title": "Updated title",
        "tags": ["tag1", "tag2"]
    }
    """
    conn = get_db_connection()
    cursor = conn.cursor()

    try:
        # Check if draft exists
        cursor.execute('SELECT * FROM drafts WHERE draft_id = ?', (draft_id,))
        draft = cursor.fetchone()

        if not draft:
            return jsonify({"error": "Draft ID not found"}), 404

        data = request.json
        if not data:
            return jsonify({"error": "Request body must be JSON"}), 400

        # Begin transaction
        conn.execute('BEGIN TRANSACTION')

        # Update fields
        updates = []
        params = []

        if 'title' in data:
            updates.append("title = ?")
            params.append(data['title'])

        if 'tags' in data:
            updates.append("tags = ?")
            params.append(json.dumps(data['tags']))

        # Add updated_at timestamp
        updates.append("updated_at = ?")
        now = datetime.now().isoformat()
        params.append(now)

        # Add draft_id to params
        params.append(draft_id)

        # Execute update
        if updates:
            query = f"UPDATE drafts SET {', '.join(updates)} WHERE draft_id = ?"
            cursor.execute(query, params)

        # Commit transaction
        conn.commit()

        # Get updated draft
        cursor.execute('SELECT * FROM drafts WHERE draft_id = ?', (draft_id,))
        updated_draft = dict(cursor.fetchone())
        updated_draft['tags'] = json.loads(updated_draft['tags'] or '[]')
        updated_draft['references'] = json.loads(updated_draft['reference_list'] or '[]')

        return jsonify({
            "status": "success",
            "message": "Draft updated successfully",
            "draft": updated_draft
        })
    except Exception as e:
        conn.rollback()
        return jsonify({"error": f"Database error: {str(e)}"}), 500
    finally:
        conn.close()

@app.route('/library/tags', methods=['GET'])
def get_all_tags():
    """
    Endpoint to get all unique tags used in the library
    """
    conn = get_db_connection()
    cursor = conn.cursor()

    try:
        cursor.execute('SELECT tags FROM drafts')
        rows = cursor.fetchall()

        # Extract and flatten all tags
        all_tags = set()
        for row in rows:
            tags = json.loads(row['tags'] or '[]')
            for tag in tags:
                all_tags.add(tag)

        tags_list = sorted(list(all_tags))

        return jsonify({
            "count": len(tags_list),
            "tags": tags_list
        })
    except Exception as e:
        return jsonify({"error": f"Database error: {str(e)}"}), 500
    finally:
        conn.close()

# Cleanup function to periodically remove old research results from memory
def cleanup_old_research():
    """Remove research results older than 24 hours from memory"""
    import time
    from datetime import timedelta

    while True:
        try:
            current_time = datetime.now()
            to_delete = []

            for research_id, data in research_results.items():
                # Check if research is completed or errored
                if data.get("status") in ["completed", "error"]:
                    # Check if it has a timestamp
                    completed_at = data.get("completed_at") or data.get("error_at")
                    if completed_at:
                        completed_time = datetime.fromisoformat(completed_at)
                        # Delete if older than 24 hours
                        if current_time - completed_time > timedelta(hours=24):
                            to_delete.append(research_id)

            # Delete old research results
            for research_id in to_delete:
                del research_results[research_id]
                print(f"Cleaned up old research data: {research_id}")

        except Exception as e:
            print(f"Error in cleanup task: {str(e)}")

        # Sleep for 1 hour
        time.sleep(3600)

if __name__ == '__main__':
    print("\n" + "="*50)
    print("DEEP WEB RESEARCHER API SERVER")
    print("="*50)

    # Initialize database
    init_db()

    # Start cleanup thread
    cleanup_thread = threading.Thread(target=cleanup_old_research)
    cleanup_thread.daemon = True
    cleanup_thread.start()

    print("Server is starting...")
    print("The research agent will process requests in the background")
    print("Database initialized and ready")
    print("PDF processing enabled with RAG pipeline")
    print("="*50)
    app.run(debug=True, host='0.0.0.0', port=5000)