import gradio as gr
from draftagent import conduct_research_workflow, select_content_style

def research_interface(query, style_number):
    style_number = int(style_number.split(".")[0])
    
    content_style = select_content_style(style_number)
    
    result = conduct_research_workflow(query, content_style)
    
    if result.get("status") == "completed":
        references = result.get('references', [])
        references_text = "\n".join(references) if references else "No references available"
        
        draft_with_references = result['draft_content']
        
        if "References" not in draft_with_references and references:
            draft_with_references += "\n\n## References\n" + references_text
        
        return (
            f"Original Query: {result['query']}\nOptimized Query: {result['optimized_query']}",
            result['research_output'],
            result['fact_check_report'],
            draft_with_references,
            references_text
        )
    else:
        error_message = f"Workflow Error: {result.get('error', 'Unknown error')}"
        return (
            error_message,
            result.get('research_output', 'Research could not be completed.'),
            result.get('fact_check_report', 'Fact-checking could not be performed.'),
            result.get('draft_content', 'Content draft could not be generated.'),
            "No references available"
        )

# Creating the Gradio interface
with gr.Blocks(title="Advanced Research Engine") as app:
    gr.Markdown("# Advanced Research Engine")
    gr.Markdown("Enter your research query and select a content style to generate comprehensive research with fact-checking.")
    
    with gr.Row():
        with gr.Column():
            query_input = gr.Textbox(
                label="Research Query",
                placeholder="Enter your research question here...",
                lines=3
            )
            
            style_dropdown = gr.Dropdown(
                choices=["1. Blog post", "2. Detailed report", "3. Executive summary"],
                label="Content Style",
                value="1. Blog post"
            )
            
            submit_button = gr.Button("Start Research", variant="primary")
        
    # with gr.Row():
    #     with gr.Column():
    #         gr.Markdown("### Research Summary")
    #         query_output = gr.Textbox(label="Query Information", lines=3)
    
    with gr.Tabs():
        with gr.TabItem("Query Information"):
            research_output = gr.Textbox(label="Optimized Query", lines=15)
        
        with gr.TabItem("Fact-Check Report"):
            fact_check_output = gr.Textbox(label="Fact-Check Analysis", lines=15)
        
        with gr.TabItem("Research work"):
            draft_output = gr.Textbox(label="Final Content", lines=20)
            
        with gr.TabItem("Drafted information"):
            references_output = gr.Textbox(label="Drafted content", lines=10)
    
    # Set up the click event
    submit_button.click(
        research_interface,
        inputs=[query_input, style_dropdown],
        outputs=[research_output, fact_check_output, draft_output, references_output]
    )
    
    gr.Markdown("### How It Works")
    gr.Markdown("""
    1. **Query Optimization**: Your query is refined for better search results
    2. **Research**: Comprehensive information is gathered from reliable sources
    3. **Claim Extraction**: Key claims are identified for verification
    4. **Fact-Checking**: Claims are verified against trusted sources
    5. **Content Creation**: A polished draft is created in your chosen style with proper citations
    """)

if __name__ == "__main__":
    app.launch(share=True)