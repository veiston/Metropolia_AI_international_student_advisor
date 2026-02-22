import io
from pypdf import PdfReader

def extract_text_from_pdf(file_bytes):
    try:
        file_stream = io.BytesIO(file_bytes)
        pdf = PdfReader(file_stream)
        parts = []
        for page in pdf.pages:
            text = page.extract_text()
            if text:
                parts.append(text)
        return "\n".join(parts)
    except Exception as e:
        print(f"Error extracting text from PDF: {e}")
        raise
