import os
import sys
from PyPDF2 import PdfReader

reader = PdfReader("C:\\Users\\skand\\OneDrive\\Desktop\\Projects\\AI Entrepreneurial Startup\\PLAB Test App\\Qpapers Resource\\Papers Set 1\\PLAB MCQ's Paper 1.pdf")
num_pages = len(reader.pages)
print(f"Total pages: {num_pages}")
print("--- LAST PAGE ---")
print(reader.pages[num_pages-1].extract_text())
print("--- SECOND TO LAST PAGE ---")
print(reader.pages[num_pages-2].extract_text())
