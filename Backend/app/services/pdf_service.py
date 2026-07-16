import os
from reportlab.lib.pagesizes import letter
from reportlab.pdfgen import canvas
from reportlab.lib.colors import HexColor

# Ensure the secure invoices directory exists
INVOICE_DIR = "invoices"
os.makedirs(INVOICE_DIR, exist_ok=True)


def generate_invoice_pdf(
    order_id: int, user_email: str, total_price: float, items: list
) -> str:
    """
    Generates a PDF invoice and saves it to the disk.
    Returns the file path.
    """
    file_name = f"invoice_order_{order_id}.pdf"
    file_path = os.path.join(INVOICE_DIR, file_name)

    c = canvas.Canvas(file_path, pagesize=letter)
    width, height = letter

    # Header
    c.setFont("Helvetica-Bold", 24)
    c.setFillColor(HexColor("#333333"))
    c.drawString(50, height - 50, "SHOP HUB🛒 STORE")

    c.setFont("Helvetica", 14)
    c.setFillColor(HexColor("#666666"))
    c.drawString(50, height - 80, "Tax Invoice / Receipt")

    # Order Details
    c.setFont("Helvetica-Bold", 12)
    c.setFillColor(HexColor("#000000"))
    c.drawString(50, height - 120, f"Order Number: #{order_id}")
    c.drawString(50, height - 140, f"Customer Email: {user_email}")

    # Table Header
    c.setFont("Helvetica-Bold", 12)
    c.drawString(50, height - 180, "Item")
    c.drawString(300, height - 180, "Quantity")
    c.drawString(450, height - 180, "Price")

    c.line(50, height - 185, 500, height - 185)

    # Items
    y = height - 210
    c.setFont("Helvetica", 12)
    for item in items:
        # Mocking item details for now, since we only pass limited data
        name = item.get("name", f"Product ID {item.get('product_id')}")
        qty = item.get("quantity", 1)
        price = item.get("price", 0.0)

        c.drawString(50, y, str(name))
        c.drawString(300, y, str(qty))
        c.drawString(450, y, f"${price}")
        y -= 20

    c.line(50, y - 10, 500, y - 10)

    # Totals
    c.setFont("Helvetica-Bold", 14)
    c.drawString(350, y - 40, "Total:")
    c.drawString(450, y - 40, f"${total_price}")

    # Footer
    c.setFont("Helvetica", 10)
    c.setFillColor(HexColor("#999999"))
    c.drawString(50, 50, "Thank you for shopping with us!")

    c.save()
    return file_path
