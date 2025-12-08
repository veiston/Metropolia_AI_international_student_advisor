import io
from pypdf import PdfReader

def extract_text_from_pdf(file_bytes):
    """
    Extracts text from a PDF file (provided as bytes).
    """
    try:
        # Create a BytesIO object from the file content
        file_stream = io.BytesIO(file_bytes)
        pdf = PdfReader(file_stream)
        content = "\n".join([page.extract_text() for page in pdf.pages if page.extract_text()])
        return content
    except Exception as e:
        print(f"Error extracting text from PDF: {e}")
        raise e
