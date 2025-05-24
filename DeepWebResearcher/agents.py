import os
from dotenv import load_dotenv
from langchain_groq import ChatGroq
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.output_parsers import StrOutputParser, JsonOutputParser
from langchain.tools.tavily_search import TavilySearchResults
from langchain_core.tools import Tool
from typing import List, Dict, Any, TypedDict, Annotated, Literal
import json
import re
from langgraph.graph import StateGraph, END
from rag import get_rag_pipeline


load_dotenv()

GROQ_API_KEY = os.getenv("GROQ_API_KEY")
TAVILY_API_KEY = os.getenv("TAVILY_API_KEY")

research_llm = ChatGroq(
    api_key=GROQ_API_KEY,
    model_name="deepseek-r1-distill-llama-70b"
)
#here we are using the same model for factchecking and the research but we can change the different trusted models like OpenAI models etc...
fact_checker_llm = ChatGroq(
    api_key=GROQ_API_KEY,
    model_name="deepseek-r1-distill-llama-70b"
)

tavily_search = TavilySearchResults(api_key=TAVILY_API_KEY)

summarize_prompt = ChatPromptTemplate.from_template("""
You are a research assistant that summarizes and structures search results.

Given the following raw search results:

{search_results}

Please provide a well-structured summary that:
1. Extracts the key information
2. Organizes it in a clear, logical manner
3. Removes any redundant or irrelevant information
4. Cites sources appropriately
5. Presents a comprehensive overview of the topic

Your summary should be detailed enough to provide valuable insights on the query: {query}
""")

def summarize_search_results(query: str, search_results: List[Dict[str, Any]]) -> str:
    """Summarize and structure search results using LLM"""
    try:
        # Ensure search_results is a list
        if not isinstance(search_results, list):
            print(f"Warning: Expected list of search results, got {type(search_results)}")
            if isinstance(search_results, str):
                search_results = [{"url": "N/A", "title": "Search Result", "content": search_results}]
            else:
                search_results = []
        
        # Format search results 
        formatted_results = "\n\n".join([
            f"Source: {result.get('url', 'Unknown')}\n"
            f"Title: {result.get('title', 'No title')}\n"
            f"Content: {result.get('content', 'No content')}"
            for result in search_results
        ])
        
        #  summarization chain
        chain = summarize_prompt | research_llm | StrOutputParser()
        return chain.invoke({"query": query, "search_results": formatted_results})
    except Exception as e:
        print(f"Error in summarize_search_results: {str(e)}")
        return f"Could not summarize search results due to an error: {str(e)}"
# Creating  custom  summarization tool 
def parse_summarize_input(input_str):
    """Parse the input for the summarize tool, handling potential JSON format issues."""
    try:
        # JSON parsing
        data = json.loads(input_str)
        return summarize_search_results(data["query"], data["results"])
    except json.JSONDecodeError:
        print(f"Failed to parse input as JSON: {input_str}")
        return "Error: Input must be a JSON string with 'query' and 'results' fields. Please format your input correctly."

summarize_tool = Tool(
    name="SummarizeResults",
    description="Summarizes and structures search results into a comprehensive research output. Input must be a JSON string with 'query' and 'results' fields.",
    func=parse_summarize_input
)

# Tavily search tool for fact verification wecan do with other avaikable tools for verification
fact_verification_search = TavilySearchResults(
    api_key=TAVILY_API_KEY,
    max_results=5,
    search_depth="advanced"
)

# Function to extract key claims from research output
def extract_claims(research_output):
    try:
        extraction_prompt = ChatPromptTemplate.from_template("""
        You are an expert at identifying factual claims in text. 
        From the following research output, extract the 3-5 most significant factual claims that should be verified.

        Research output:
        {research_output}

        For each claim, provide:
        1. The claim statement
        2. The importance of verifying this claim (high/medium/low)

        Format your response as a JSON array of objects with "claim" and "importance" fields.
        """)

        chain = extraction_prompt | fact_checker_llm | JsonOutputParser()
        result = chain.invoke({"research_output": research_output})
        
        # Ensure we return a list
        if not isinstance(result, list):
            print(f"Warning: Expected list of claims, got {type(result)}")
            if isinstance(result, dict) and "claim" in result:
                return [result]
            return [{"claim": "No claims could be extracted", "importance": "low"}]
            
        return result
    except Exception as e:
        print(f"Error in extract_claims: {str(e)}")
        return [{"claim": f"Error extracting claims: {str(e)}", "importance": "low"}]
# credibility check prompt
credibility_check_prompt = ChatPromptTemplate.from_template("""
You are a critical fact-checker analyzing research content. Evaluate the following claim:

CLAIM: {claim}

Based on your analysis and the provided verification data:
{verification_data}

Please provide a detailed assessment with:
1. Accuracy score (0-10)
2. Confidence level (0-10)
3. Specific inaccuracies or misrepresentations (if any)
4. Missing context or nuance
5. Potential biases in the original claim

Format your response as a JSON object with the following structure:
{{
    "accuracy_score": <score>,
    "confidence_level": <level>,
    "inaccuracies": ["<issue1>", "<issue2>", ...],
    "missing_context": ["<context1>", "<context2>", ...],
    "potential_biases": ["<bias1>", "<bias2>", ...],
    "corrected_claim": "<improved version of the claim>"
}}
""")

# Function to verify a single claim
def verify_claim(claim):
    search_results = fact_verification_search.invoke(claim)

    verification_data = "\n\n".join([
        f"Source: {result.get('url', 'Unknown')}\n"
        f"Title: {result.get('title', 'No title')}\n"
        f"Content: {result.get('content', 'No content')}"
        for result in search_results
    ])

    # Add explicit instruction to not include think tags
    modified_prompt = ChatPromptTemplate.from_template("""
    You are a critical fact-checker analyzing research content. Evaluate the following claim:

    CLAIM: {claim}

    Based on your analysis and the provided verification data:
    {verification_data}

    Please provide a detailed assessment with:
    1. Accuracy score (0-10)
    2. Confidence level (0-10)
    3. Specific inaccuracies or misrepresentations (if any)
    4. Missing context or nuance
    5. Potential biases in the original claim

    Format your response as a JSON object with the following structure:
    {{
        "accuracy_score": <score>,
        "confidence_level": <level>,
        "inaccuracies": ["<issue1>", "<issue2>", ...],
        "missing_context": ["<context1>", "<context2>", ...],
        "potential_biases": ["<bias1>", "<bias2>", ...],
        "corrected_claim": "<improved version of the claim>"
    }}

    IMPORTANT: Do not include any <think> or </think> tags in your response. Provide only valid JSON.
    """)

    try:
        chain = modified_prompt | fact_checker_llm | JsonOutputParser()
        result = chain.invoke({"claim": claim, "verification_data": verification_data})
        return result
    except Exception as e:
        print(f"Error parsing fact-check response: {str(e)}")
        # Fallback response if parsing fails
        return {
            "accuracy_score": 5,
            "confidence_level": 5,
            "inaccuracies": [f"Could not properly verify: {str(e)}"],
            "missing_context": ["Verification process failed"],
            "potential_biases": ["Unable to assess due to verification failure"],
            "corrected_claim": claim
        }
# Function to extract references from verification data
# Function to extract references from verification data
def extract_references(verification_results):
    references = []
    for i, result in enumerate(verification_results, 1):
        verification_data = result.get("verification_data", "")
        sources = re.findall(r"Source: (https?://[^\n]+)", verification_data)
        for source in sources:
            if source not in [ref.split(". ")[1] for ref in references if len(ref.split(". ")) > 1]:
                references.append(f"{len(references) + 1}. {source}")
    return references

# query optimization function
def optimize_query_directly(query: str) -> str:
    optimization_prompt = ChatPromptTemplate.from_template("""
    You are a query optimization expert. Your task is to transform natural language queries into 
    detailed, domain-specific optimized queries that can be processed by specialized systems.

    Original query: {query}

    Please provide an optimized version of this query that:
    1. Is more specific and detailed
    2. Includes relevant domain terminology
    3. Is structured for better processing by downstream systems
    4. Maintains the original intent of the query

    Optimized query:
    """)
    
    chain = optimization_prompt | research_llm | StrOutputParser()
    return chain.invoke({"query": query})

#  content style selection functions
def select_content_style(style_number: int) -> str:
    styles = {1: "blog post", 2: "detailed report", 3: "executive summary"}
    return styles.get(style_number, "blog post")  # Default to blog post if invalid number

def get_style_prompt(style: str) -> str:
    if style == "blog post":
        return "Create an engaging blog post that presents the research findings in a conversational tone with clear headings, examples, and actionable insights."
    elif style == "detailed report":
        return "Structure a comprehensive report with executive summary, methodology, findings, analysis, and recommendations. Include relevant data points and cite sources appropriately."
    elif style == "executive summary":
        return "Provide a concise executive summary highlighting key findings, implications, and recommended actions. Focus on business impact and strategic considerations."

#states for the LangGraph workflow
class ResearchState(TypedDict):
    query: str
    optimized_query: str
    research_output: str
    claims: List[Dict[str, Any]]
    verification_results: List[Dict[str, Any]]
    references: List[str]
    fact_check_report: str
    content_style: str
    draft_content: str
    status: str
    pdf_context: str  # New field for PDF context

#nodes for the LangGraph workflow
def optimize_query(state: ResearchState) -> ResearchState:
    print("Optimizing query...")
    optimized_query = optimize_query_directly(state["query"])
    return {"optimized_query": optimized_query}

def conduct_research(state: ResearchState) -> ResearchState:
    print(f"Conducting research on: {state['optimized_query']}")
    
    # Get PDF context if available
    pdf_context = state.get("pdf_context", "")
    
    research_prompt = ChatPromptTemplate.from_template("""
    You are a thorough research assistant. Your task is to provide comprehensive information about the following query:
    
    {query}
    
    {pdf_context_instruction}
    
    Please conduct detailed research and provide a well-structured response that:
    1. Covers all important aspects of the topic
    2. Includes relevant facts, data, and context
    3. Presents different perspectives when applicable
    4. Cites sources where appropriate
    
    Your response should be thorough, accurate, and well-organized.
    """)
    
    try:
        # Search for information
        search_results = tavily_search.invoke(state["optimized_query"])
        
        # Check if search_results is a list of dictionaries as expected
        if not isinstance(search_results, list):
            print(f"Warning: Expected list of search results, got {type(search_results)}")
            # Convert to expected format if possible
            if isinstance(search_results, str):
                search_results = [{"url": "N/A", "title": "Search Result", "content": search_results}]
            else:
                # Default empty list 
                search_results = []
        
        # If we have PDF context, add it to the search results
        if pdf_context:
            pdf_context_instruction = "Additionally, consider the following information from relevant documents:"
            pdf_result = {
                "url": "Internal PDF Document",
                "title": "PDF Document Context",
                "content": pdf_context
            }
            search_results.append(pdf_result)
        else:
            pdf_context_instruction = ""
        
        # Summarize the search results
        research_output = summarize_search_results(
            state["optimized_query"], 
            search_results
        )
        
        return {"research_output": research_output}
    except Exception as e:
        print(f"Error in conduct_research: {str(e)}")
        # Return a placeholder research output to allow the workflow to continue
        return {"research_output": f"Research could not be completed due to an error: {str(e)}"}

def extract_key_claims(state: ResearchState) -> ResearchState:
    print("Extracting key claims from research output...")
    claims = extract_claims(state["research_output"])
    return {"claims": claims}

def verify_claims(state: ResearchState) -> ResearchState:
    print("Verifying claims against trusted sources...")
    verification_results = []
    
    for claim_item in state["claims"]:
        claim = claim_item.get("claim")
        importance = claim_item.get("importance")
        
        # Verify the claim
        verification = verify_claim(claim)
        
        # Store the verification data for reference extraction
        search_results = fact_verification_search.invoke(claim)
        verification_data = "\n\n".join([
            f"Source: {result.get('url', 'Unknown')}\n"
            f"Title: {result.get('title', 'No title')}\n"
            f"Content: {result.get('content', 'No content')}"
            for result in search_results
        ])
        
        verification["claim"] = claim
        verification["importance"] = importance
        verification["verification_data"] = verification_data
        verification_results.append(verification)
    
    # Extract references from verification data
    references = extract_references(verification_results)
    
    return {
        "verification_results": verification_results,
        "references": references
    }

def generate_fact_check_report(state: ResearchState) -> ResearchState:
    print("Generating fact-check report...")
    
    # Clean verification results for the prompt by removing verification_data
    clean_verification_results = []
    for v in state["verification_results"]:
        v_clean = v.copy()
        if "verification_data" in v_clean:
            del v_clean["verification_data"]
        clean_verification_results.append(v_clean)
    
    overall_report_prompt = ChatPromptTemplate.from_template("""
    You are a critical fact-checker generating a comprehensive verification report.
    
    Original research output:
    {research_output}
    
    Detailed verification results for key claims:
    {verification_results}
    
    References used in verification:
    {references}
    
    Please provide a comprehensive fact-check report that:
    1. Summarizes the overall reliability of the research (with an overall score from 0-10)
    2. Highlights the most significant accuracy issues
    3. Provides context for any misleading or incomplete information
    4. Suggests improvements to make the research more accurate and balanced
    5. Includes a properly formatted "References" section at the end listing all sources used in verification
    
    Your report should be detailed, fair, and constructive. Make sure to cite specific references by number when discussing claims.
    """)
    
    chain = overall_report_prompt | fact_checker_llm | StrOutputParser()
    fact_check_report = chain.invoke({
        "research_output": state["research_output"],
        "verification_results": json.dumps(clean_verification_results, indent=2),
        "references": "\n".join(state["references"])
    })
    
    return {"fact_check_report": fact_check_report}

def create_draft_content(state: ResearchState) -> ResearchState:
    print(f"Drafting content in {state['content_style']} style...")
    
    draft_prompt = ChatPromptTemplate.from_template("""
    Based on the following research results, create a {style} content where you will draft info only about the query {optimized_query} and the research findings. Not about the process like fact checking query optimization just use the Research findings:
    {research} and Fact-check report:
    {fact_check} to generate this {style} based draft having the References:
    {references} at the end of the draft
    The content should be informative, engaging, and suitable for the target audience.
    
    Please structure the draft in a clear, engaging {style} format.
    Do not include any <think> or </think> tags in your response.
    """)
    
    chain = draft_prompt | research_llm | StrOutputParser()
    draft_content = chain.invoke({
        "optimized_query": state["optimized_query"],
        "research": state["research_output"],
        "fact_check": state["fact_check_report"],
        "style": state["content_style"],
        "references": "\n".join(state["references"])
    })
    draft_content = re.sub(r'<think>.*?</think>', '', draft_content, flags=re.DOTALL)
    
    return {
        "draft_content": draft_content,
        "status": "completed"
    }

def create_research_workflow():
    # Initialize the graph
    workflow = StateGraph(ResearchState)
    
    # Add nodes
    workflow.add_node("optimize_query", optimize_query)
    workflow.add_node("conduct_research", conduct_research)
    workflow.add_node("extract_key_claims", extract_key_claims)
    workflow.add_node("verify_claims", verify_claims)
    workflow.add_node("generate_fact_check_report", generate_fact_check_report)
    workflow.add_node("create_draft_content", create_draft_content)
    
    # Define edges
    workflow.set_entry_point("optimize_query")
    workflow.add_edge("optimize_query", "conduct_research")
    workflow.add_edge("conduct_research", "extract_key_claims")
    workflow.add_edge("extract_key_claims", "verify_claims")
    workflow.add_edge("verify_claims", "generate_fact_check_report")
    workflow.add_edge("generate_fact_check_report", "create_draft_content")
    workflow.add_edge("create_draft_content", END)
    
    return workflow.compile()

# Main research flow function using LangGraph
def conduct_research_workflow(query: str, content_style: str, pdf_context: str = "") -> Dict[str, Any]:
    """
    Conduct research based on a query using the LangGraph workflow
    
    Args:
        query: The user's original query
        content_style: Desired content style for the draft
        pdf_context: Optional context from PDF documents
        
    Returns:
        Dictionary containing all research results and content draft
    """
    print(f"Starting research workflow on query: {query}")
    
    try:
        workflow = create_research_workflow()
        
        initial_state = {
            "query": query,
            "optimized_query": "",
            "research_output": "",
            "claims": [],
            "verification_results": [],
            "references": [],
            "fact_check_report": "",
            "content_style": content_style,
            "draft_content": "",
            "status": "in_progress",
            "pdf_context": pdf_context
        }
        
        result = workflow.invoke(initial_state)
        
        return result
    except Exception as e:
        print(f"Error in research workflow: {str(e)}")
        return {
            "query": query,
            "optimized_query": "",
            "research_output": f"Error during research: {str(e)}",
            "fact_check_report": "Fact-checking could not be performed due to research error.",
            "content_style": content_style,
            "draft_content": "",
            "status": "error",
            "error": str(e)
        }

if __name__ == "__main__":
    ####### this input output is for testing purposes onlyin ternimal  
    user_query = input("Enter your research query: ")
    
    print("\nSelect content style:")
    print("1. Blog post")
    print("2. Detailed report")
    print("3. Executive summary")
    style_number = int(input("Enter style number (1-3): "))
    content_style = select_content_style(style_number)
    print(f"Selected style: {content_style}")
    
    # Ask if user wants to use a PDF for context
    use_pdf = input("\nDo you want to use a PDF for additional context? (y/n): ").lower() == 'y'
    pdf_context = ""
    
    if use_pdf:
        pdf_path = input("Enter the path to your PDF file: ")
        try:
            from rag import get_rag_pipeline
            rag_pipeline = get_rag_pipeline()
            rag_pipeline.process_pdf(pdf_path, {"source": "user_upload"})
            pdf_context = rag_pipeline.get_relevant_context(user_query)
            print(f"PDF processed and relevant context extracted ({len(pdf_context)} characters)")
        except Exception as e:
            print(f"Error processing PDF: {str(e)}")
    
    # Execute the research workflow
    result = conduct_research_workflow(user_query, content_style, pdf_context)
    
    # Display results
    print("\n" + "="*50)
    print("RESEARCH WORKFLOW RESULTS")
    print("="*50)
    
    if result.get("status") == "completed":
        print(f"Original Query: {result['query']}")
        print(f"Optimized Query: {result['optimized_query']}")
        
        print("\nRESEARCH OUTPUT:")
        print("-"*50)
        print(result['research_output'])
        
        print("\nFACT-CHECK REPORT:")
        print("-"*50)
        print(result['fact_check_report'])
        
        print("\nCONTENT DRAFT:")
        print("-"*50)
        print(f"Style: {result['content_style']}")
        print(result['draft_content'])
    else:
        print(f"Workflow Error: {result.get('error', 'Unknown error')}")
        print("Partial results:")
        for key, value in result.items():
            if key not in ["error", "status"] and value:
                print(f"\n{key.upper()}:")
                print(value)