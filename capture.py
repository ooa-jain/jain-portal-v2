import os
import time
from selenium import webdriver
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.common.by import By
from fpdf import FPDF

def main():
    print("Initializing headless Chrome driver...")
    options = Options()
    options.add_argument("--headless")
    options.add_argument("--window-size=1920,1080")
    options.add_argument("--disable-gpu")
    
    # Modern Selenium 4.x handles driver downloading/managing automatically
    driver = webdriver.Chrome(options=options)
    
    os.makedirs('temp_screenshots', exist_ok=True)
    os.makedirs(os.path.join('static', 'uploads'), exist_ok=True)
    
    try:
        # 1. Login Page
        print("Navigating to Login page...")
        driver.get("http://localhost:5000/login")
        time.sleep(3)
        driver.save_screenshot("temp_screenshots/1_login.png")
        
        # Log in HOD
        print("Logging in HOD...")
        email_input = driver.find_element(By.ID, "auth_l_email")
        email_input.send_keys("testhod@jainuniversity.ac.in")
        login_btn = driver.find_element(By.XPATH, "//button[contains(text(), 'Login')]")
        login_btn.click()
        time.sleep(3)
        
        # 2. HOD Dashboard
        print("Capturing HOD Dashboard...")
        driver.save_screenshot("temp_screenshots/2_dashboard.png")
        
        # 3. Readiness Checklist
        print("Navigating to Readiness List...")
        driver.get("http://localhost:5000/readiness")
        time.sleep(3)
        driver.save_screenshot("temp_screenshots/3_readiness.png")
        
        # 4. Closure List
        print("Navigating to Closure List...")
        driver.get("http://localhost:5000/closure")
        time.sleep(3)
        driver.save_screenshot("temp_screenshots/4_closure.png")
        
        # Logout
        print("Logging out HOD...")
        driver.get("http://localhost:5000/api/logout")
        time.sleep(2)
        
        # Compile PDF
        print("Compiling PDF...")
        pdf = FPDF(orientation='L', unit='mm', format='A4') # Landscape A4 fits screenshots perfectly
        
        images = [
            ("1. Login Screen & Workflow Overview", "temp_screenshots/1_login.png"),
            ("2. HOD Dashboard Module Selector", "temp_screenshots/2_dashboard.png"),
            ("3. Semester Readiness Checklist Dashboard", "temp_screenshots/3_readiness.png"),
            ("4. Semester Closure Report Dashboard", "temp_screenshots/4_closure.png")
        ]
        
        for title, img_path in images:
            if os.path.exists(img_path):
                pdf.add_page()
                pdf.set_font("Arial", "B", 16)
                pdf.set_text_color(10, 37, 88) # Primary Navy theme color
                pdf.cell(0, 10, title, ln=True, align="C")
                pdf.ln(5)
                # Maximize size within A4 Landscape margins (297mm x 210mm)
                # Max width ~270, height ~160
                pdf.image(img_path, x=13, y=25, w=270, h=160)
        
        pdf.output("static/uploads/Workflow.pdf")
        print("Successfully generated static/uploads/Workflow.pdf!")
        
    except Exception as e:
        print(f"Error occurred: {e}")
    finally:
        driver.quit()
        # Clean up temp images
        for f in os.listdir('temp_screenshots'):
            try:
                os.remove(os.path.join('temp_screenshots', f))
            except:
                pass
        try:
            os.rmdir('temp_screenshots')
        except:
            pass

if __name__ == '__main__':
    main()
