import os
from typing import List, Optional
from langchain.document_loaders import PyPDFLoader
from langchain.text_splitter import RecursiveCharacterTextSplitter
from langchain.chains import RetrievalQA
from langchain_community.llms import HuggingFaceHub
from mistralai import Mistral
from langchain_core.embeddings import Embeddings
from langchain_community.vectorstores import Qdrant as QdrantVectorStore
from qdrant_client import QdrantClient
from qdrant_client.models import Distance, VectorParams

# Load environment variables from .env file
from dotenv import load_dotenv
load_dotenv()

QDRANT_API_KEY = os.getenv("QDRANT_API_KEY")
MISTRAL_API_KEY = os.getenv("MISTRAL_API_KEY")
QDRANT_URL = os.getenv("QDRANT_URL")
HUGGINGFACEHUB_API_TOKEN = os.getenv("HUGGINGFACEHUB_API_TOKEN")

class MistralEmbeddings(Embeddings):
        def __init__(self, api_key: str, model: str = "mistral-embed", target_dim: int = 1536):
            self.client = Mistral(api_key=api_key)
            self.model = model
            self.target_dim = target_dim

        def _pad_embedding(self, embedding: List[float]) -> List[float]:
            if len(embedding) >= self.target_dim:
                return embedding[:self.target_dim]
            else:
                return embedding + [0.0] * (self.target_dim - len(embedding))

        def embed_documents(self, texts: List[str]) -> List[List[float]]:
            embeddings_response = self.client.embeddings.create(
                model=self.model,
                inputs=texts,
            )
            return [self._pad_embedding(data.embedding) for data in embeddings_response.data]

        def embed_query(self, text: str) -> List[float]:
            embeddings_response = self.client.embeddings.create(
                model=self.model,
                inputs=[text],
            )
            return self._pad_embedding(embeddings_response.data[0].embedding)

class RAGPipeline:
        def __init__(self):
            self.embeddings = MistralEmbeddings(api_key=MISTRAL_API_KEY)
            self.client = QdrantClient(url=QDRANT_URL, api_key=QDRANT_API_KEY)
            self.collection_name = "RAGdata"
            self.vector_size = 1536
            self._initialize_collection()
            self.vector_store = QdrantVectorStore(
                client=self.client,
                collection_name=self.collection_name,
                embeddings=self.embeddings
            )
            self.llm = HuggingFaceHub(
                repo_id="google/flan-t5-large",
                huggingfacehub_api_token=HUGGINGFACEHUB_API_TOKEN
            )

        def _initialize_collection(self):
            collections = self.client.get_collections().collections
            collection_names = [collection.name for collection in collections]
            if self.collection_name not in collection_names:
                self.client.create_collection(
                    collection_name=self.collection_name,
                    vectors_config=VectorParams(size=self.vector_size, distance=Distance.COSINE)
                )

        def process_pdf(self, pdf_path: str, metadata: Optional[dict] = None):
            """Process a PDF file and add it to the vector store with optional metadata"""
            print(f"Processing PDF: {pdf_path}")
            loader = PyPDFLoader(pdf_path)
            documents = loader.load()

            # Add metadata to documents if provided
            if metadata:
                for doc in documents:
                    doc.metadata.update(metadata)

            text_splitter = RecursiveCharacterTextSplitter(
                chunk_size=1000,
                chunk_overlap=200
            )
            texts = text_splitter.split_documents(documents)

            # Store the documents in the vector store
            self.vector_store.add_documents(texts)
            print(f"Added {len(texts)} chunks from PDF to vector store")
            return len(texts)

        def query(self, query_text: str, top_k: int = 5) -> dict:
            """Query the vector store and return both the answer and retrieved documents"""
            retriever = self.vector_store.as_retriever(search_kwargs={"k": top_k})

            # Get the raw documents for context enhancement
            retrieved_docs = retriever.get_relevant_documents(query_text)

            # Create QA chain for generating the answer
            qa_chain = RetrievalQA.from_chain_type(
                llm=self.llm,
                chain_type="stuff",
                retriever=retriever
            )

            # Generate the answer
            response = qa_chain.run(query_text)

            # Return both the answer and the retrieved documents
            return {
                "answer": response,
                "documents": [
                    {
                        "content": doc.page_content,
                        "metadata": doc.metadata
                    } for doc in retrieved_docs
                ]
            }

        def get_relevant_context(self, query_text: str, top_k: int = 5) -> str:
            """Get relevant context from the vector store without generating an answer"""
            retriever = self.vector_store.as_retriever(search_kwargs={"k": top_k})
            retrieved_docs = retriever.get_relevant_documents(query_text)

            # Combine the content from retrieved documents
            context = "\n\n".join([doc.page_content for doc in retrieved_docs])
            return context

# Global RAG pipeline instance for reuse
_rag_pipeline = None

def get_rag_pipeline():
    """Get or create a RAG pipeline instance"""
    global _rag_pipeline
    if _rag_pipeline is None:
        _rag_pipeline = RAGPipeline()
    return _rag_pipeline