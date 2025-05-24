# DeepWebResearcher

DeepWebResearcher is an advanced AI agent-based research engine that automates comprehensive web research, fact-checking, and content creation using a multi-agent system built on LangGraph and LangChain.

## Problem Statement

This project addresses the need for an AI agent-based Deep Research system that:
1. Crawls websites using Tavily for online information gathering
2. Implements a multi-agent system with specialized roles:
   - Research agent for data collection and analysis
   - Fact-checking agent for verification
   - Content drafting agent for final output creation
3. Utilizes LangGraph & LangChain frameworks to effectively organize the gathered information
4. Produces well-structured, verified research content

## Overview

DeepWebResearcher helps users conduct deep research on any topic through a coordinated multi-agent system that:
1. Optimizes search queries for better information retrieval
2. Gathers comprehensive information from reliable sources across the web
3. Extracts and verifies key claims against trusted sources
4. Generates well-structured content in various formats based on verified research

## Architecture
![Editor___Mermaid_Chart-2025-04-26-142941 1](https://github.com/user-attachments/assets/35f81358-1a32-4b1c-b9c9-fd9585db7978)


### Multi-Agent System

The solution implements a multi-agent architecture where specialized agents work together in a coordinated workflow:

1. **Research Agent**: 
   - Optimizes user queries for better search results
   - Crawls the web using Tavily Search API
   - Gathers and synthesizes information from multiple sources
   - Produces structured research output

2. **Fact-Checking Agent**:
   - Extracts key claims from research
   - Verifies each claim against trusted sources
   - Evaluates accuracy, identifies inaccuracies, and provides context
   - Generates comprehensive fact-check reports

3. **Content Drafting Agent**:
   - Takes verified research and fact-check reports
   - Adapts content to user-selected style (blog post, report, executive summary)
   - Creates polished, well-structured content with proper citations
   - Ensures factual accuracy based on verification results

### Technology Stack

- **LLM Models**: Groq's deepseek-r1-distill-llama-70b powers all agents
- **Web Crawling**: Tavily Search API for information gathering and verification
- **Agent Orchestration**: LangGraph for workflow management and agent coordination
- **LLM Interaction**: LangChain for prompting, parsing, and tool integration
- **Frontend**: Gradio for the user interface
- **Backend**: Python with state management through LangGraph

## LangGraph Agent Workflow

The system uses LangGraph to create a directed graph of agent interactions, where each node represents an agent performing a specific task:

```
optimize_query → conduct_research → extract_key_claims → verify_claims → generate_fact_check_report → create_draft_content → END
```

### State Management

LangGraph manages a shared state object (`ResearchState`) that tracks all information throughout the research process:

```python
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
```

This state is passed between agents, allowing each to:
1. Access outputs from previous agents
2. Contribute their own results
3. Maintain the complete research context

### Agent Implementation with LangChain

Each agent is implemented using LangChain components:

1. **Prompt Templates**: Define the agent's task and expected output format
2. **LLM Integration**: Connect to the Groq API for reasoning and generation
3. **Output Parsers**: Structure LLM outputs into usable formats (JSON, text)
4. **Tool Integration**: Connect to external services like Tavily Search

For example, the Research Agent uses this pattern:
```python
research_prompt = ChatPromptTemplate.from_template("""
You are a thorough research assistant. Your task is to provide comprehensive information about the following query:

{query}

Please conduct detailed research and provide a well-structured response that:
1. Covers all important aspects of the topic
2. Includes relevant facts, data, and context
3. Presents different perspectives when applicable
4. Cites sources where appropriate

Your response should be thorough, accurate, and well-organized.
""")

chain = research_prompt | research_llm | StrOutputParser()
research_output = chain.invoke({"query": optimized_query})
```

## Detailed Agent Capabilities

### 1. Research Agent

**Web Crawling and Information Gathering**:
- Uses Tavily Search API to crawl relevant websites based on optimized queries
- Retrieves comprehensive information from multiple sources
- Handles different types of content (articles, reports, data)

**Query Optimization**:
```python
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
```

**Information Synthesis**:
```python
def summarize_search_results(query: str, search_results: List[Dict[str, Any]]) -> str:
    """Summarize and structure search results using LLM"""
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
```

### 2. Fact-Checking Agent

**Claim Extraction**:
```python
def extract_claims(research_output):
    """Extract key factual claims from research output"""
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
    return chain.invoke({"research_output": research_output})
```

**Claim Verification**:
```python
def verify_claim(claim):
    """Verify a single claim using search and LLM analysis"""
    search_results = fact_verification_search.invoke(claim)

    verification_data = "\n\n".join([
        f"Source: {result.get('url', 'Unknown')}\n"
        f"Title: {result.get('title', 'No title')}\n"
        f"Content: {result.get('content', 'No content')}"
        for result in search_results
    ])

    chain = credibility_check_prompt | fact_checker_llm | JsonOutputParser()
    return chain.invoke({"claim": claim, "verification_data": verification_data})
```

**Reference Extraction**:
```python
def extract_references(verification_results):
    references = []
    for i, result in enumerate(verification_results, 1):
        verification_data = result.get("verification_data", "")
        sources = re.findall(r"Source: (https?://[^\n]+)", verification_data)
        for source in sources:
            if source not in [ref.split(". ")[1] for ref in references]:
                references.append(f"{len(references) + 1}. {source}")
    return references
```

### 3. Content Drafting Agent

**Style Selection**:
```python
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
```

**Content Creation**:
```python
def create_draft_content(state: ResearchState) -> ResearchState:
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
    
    return {
        "draft_content": draft_content,
        "status": "completed"
    }
```

## LangGraph Workflow Implementation

The entire multi-agent system is orchestrated through LangGraph:

```python
def create_research_workflow():
    # Initialize the graph
    workflow = StateGraph(ResearchState)
    
    # Add nodes (each representing an agent)
    workflow.add_node("optimize_query", optimize_query)
    workflow.add_node("conduct_research", conduct_research)
    workflow.add_node("extract_key_claims", extract_key_claims)
    workflow.add_node("verify_claims", verify_claims)
    workflow.add_node("generate_fact_check_report", generate_fact_check_report)
    workflow.add_node("create_draft_content", create_draft_content)
    
    # Define edges (agent interaction flow)
    workflow.set_entry_point("optimize_query")
    workflow.add_edge("optimize_query", "conduct_research")
    workflow.add_edge("conduct_research", "extract_key_claims")
    workflow.add_edge("extract_key_claims", "verify_claims")
    workflow.add_edge("verify_claims", "generate_fact_check_report")
    workflow.add_edge("generate_fact_check_report", "create_draft_content")
    workflow.add_edge("create_draft_content", END)
    
    return workflow.compile()
```

This graph structure:
- Defines each agent as a node
- Establishes the sequence of agent interactions
- Manages the flow of information between agents
- Tracks the complete state throughout the process

## User Interface

The system provides a Gradio-based web interface that allows users to:
1. Enter a research query
![Screenshot_2025-04-26_170229 2](https://github.com/user-attachments/assets/5fe3130d-222e-43db-9e42-754950d90a83)

3. Select a content style (Blog post, Detailed report, or Executive summary)
4. View the research results in multiple tabs:
   - Query Information
   - Fact-Check Report
   - Research work (Final Content)
   - Drafted information (References)

![Screenshot_2025-04-26_170336 2](https://github.com/user-attachments/assets/fac96320-ac65-468c-98b9-7b3384d45d05)

## Output Formats

### Research Output
Comprehensive information gathered from reliable sources, structured in a logical manner.

### Fact-Check Report
A detailed analysis of key claims, including:
- Overall reliability score (0-10)
- Significant accuracy issues
- Context for misleading information
- Suggested improvements
- References to verification sources


### Content Draft
A polished document in the user's chosen style:
1. **Blog Post**: Conversational tone with clear headings and actionable insights
2. **Detailed Report**: Comprehensive structure with executive summary, methodology, findings, and recommendations
3. **Executive Summary**: Concise overview highlighting key findings and strategic implications

## Setup and Usage

### Installing Dependencies

1. Clone the repository:
```bash
git clone https://github.com/sahilsaurav2507/DeepWebResearcher.git
cd DeepWebResearcher
```

2. Install required packages:
```bash
pip install -r requirements.txt
```

3. Create a `.env` file in the project root with your API keys:
```
GROQ_API_KEY=your_groq_api_key_here
TAVILY_API_KEY=your_tavily_api_key_here
```

### Environment Variables
The system requires the following API keys:
- `GROQ_API_KEY`: For accessing Groq's LLM models
- `TAVILY_API_KEY`: For web search capabilities

### Running the Application
Run the Gradio interface:
```bash
python gradio_interface.py
```

The web interface will be available at http://127.0.0.1:7860 by default.


## Limitations and Considerations
- The quality of research depends on the availability of information through the Tavily Search API
- Fact-checking is limited to publicly available information
- LLM-based analysis may occasionally contain inaccuracies or biases
- Processing time varies based on query complexity and API response times
