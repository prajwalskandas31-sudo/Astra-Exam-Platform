import os
import sys

try:
    from PyPDF2 import PdfReader
except ImportError:
    os.system("pip install PyPDF2")
    from PyPDF2 import PdfReader

reader = PdfReader("C:\\Users\\skand\\OneDrive\\Desktop\\Projects\\AI Entrepreneurial Startup\\PLAB Test App\\Qpapers Resource\\Papers Set 1\\PLAB MCQ's Paper 1 answer keys.pdf")
print(reader.pages[0].extract_text())
