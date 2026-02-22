# E-Commerce Landing Site

Production-ready static e-commerce site with ad-driven deep-linking, cart management, and Google Sheets integration.

## Files Overview

- `index.html` - Main HTML structure
- `style.css` - Stylesheet with CSS variables
- `script.js` - All functionality and configuration
- `README.md` - This file

## Quick Start - Editing Configuration

### 1. Store Configuration (`script.js`)

Open `script.js` and edit the `CONFIG` object at the top (lines ~15-30):

```javascript
const CONFIG = {
  STORE_NAME: "My Store", // Change to your store name
  CURRENCY: "DZD", // Currency code
  WEBHOOK_URL: "https://...", // Replace with your Google Apps Script URL
  WEBHOOK_SECRET: "your-secret-key-change-this", // Change to a secure secret
  PRIMARY_COLOR: "#2563eb", // Primary brand color (hex)
  ACCENT_COLOR: "#10b981", // Accent color (hex)
  SUCCESS_MESSAGE: "Order placed successfully!",
  ERROR_MESSAGE: "Something went wrong. Please try again.",
  LOADING_TEXT: "Processing...",
  UTM_CAPTURE: true, // Enable/disable UTM tracking
  MAX_CLIENT_RETRIES: 3, // Max retry attempts
  RETRY_BACKOFF_MS: 1000, // Base retry delay in ms
};
```

### 2. Product Catalog (`script.js`)

Edit the `PRODUCTS` array (lines ~35+) to add or modify products:

```javascript
const PRODUCTS = [
  {
    id: "BT-001", // Unique product ID
    name: "Black Tee", // Product name
    sku: "BT-001", // SKU code
    price: 4500, // Price (number, no currency symbol)
    images: [
      // Array of image URLs
      "https://example.com/image1.jpg",
      "https://example.com/image2.jpg",
    ],
    description: "Product description here.",
    inventory: 50, // Stock count (null for unlimited)
    tags: ["clothing", "t-shirt"], // Tags for filtering
    sizes: ["S", "M", "L", "XL"], // Available sizes (empty array if no sizes)
  },
  // Add more products here...
];
```

**Important:** To add a new product, simply add a new object to the `PRODUCTS` array. The site will automatically render it.

### 3. Wilayas List (`script.js`)

The `WILAYAS` array (lines ~100+) contains all 58 Algerian provinces (wilayas) with both French and Arabic names in the format "French Name - Arabic Name". The list is complete and verified. Each wilaya appears as:

```javascript
const WILAYAS = [
  "Adrar - أدرار",
  "Chlef - الشلف",
  // ... all 58 wilayas
];
```

The full string (including both names) will be sent to the webhook and stored in Google Sheets, which is useful for display purposes.

### 4. Meta Tags (`index.html`)

Edit the Open Graph meta tags in the `<head>` section (around lines 8-11):

```html
<meta property="og:title" content="My Store - Quality Products" />
<meta
  property="og:description"
  content="Shop quality products online - Fast delivery across Algeria"
/>
```

Also update the `<title>` tag on line 12.

### 5. Colors (`style.css`)

Edit CSS variables at the top of `style.css` (lines ~10-20) to change theme colors:

```css
:root {
  --primary-color: #2563eb; /* Main brand color */
  --accent-color: #10b981; /* Accent color */
  /* ... other variables */
}
```

## Google Apps Script Webhook Setup

### Step 1: Create Google Apps Script

1. Go to [script.google.com](https://script.google.com)
2. Click "New Project"
3. Replace the default code with the snippet below
4. Save the project

### Step 2: Deploy as Web App

1. Click "Deploy" → "New deployment"
2. Click the gear icon ⚙️ → Select "Web app"
3. Set:
   - **Execute as**: Me
   - **Who has access**: Anyone
4. Click "Deploy"
5. Copy the **Web app URL** (this is your `WEBHOOK_URL`)

### Step 3: Create Google Sheet

1. Create a new Google Sheet
2. Name the first sheet "Orders"
3. Add these column headers in row 1:
   ```
   Timestamp | OrderID | Items | Qty | Subtotal | Total | FirstName | LastName | Phone | Wilaya | Address | Notes | UTM_source | UTM_medium | UTM_campaign | RawJSON
   ```
4. Copy the Sheet ID from the URL (between `/d/` and `/edit`)
5. Replace `YOUR_SHEET_ID` in the script below

### Step 4: Apps Script Code

Replace the default code in your Apps Script project with this:

```javascript
// Configuration
const SHEET_ID = "YOUR_SHEET_ID"; // Replace with your Google Sheet ID
const WEBHOOK_SECRET = "your-secret-key-change-this"; // Must match CONFIG.WEBHOOK_SECRET

function doPost(e) {
  try {
    // Parse request
    const data = JSON.parse(e.postData.contents);

    // Verify secret
    if (data.secret !== WEBHOOK_SECRET) {
      return ContentService.createTextOutput(
        JSON.stringify({
          success: false,
          error: "Invalid secret",
        }),
      ).setMimeType(ContentService.MimeType.JSON);
    }

    // Open spreadsheet
    const sheet = SpreadsheetApp.openById(SHEET_ID).getSheetByName("Orders");
    if (!sheet) {
      throw new Error('Sheet "Orders" not found');
    }

    // Prepare row data
    const items = Array.isArray(data.items)
      ? data.items
      : JSON.parse(data.itemsStr || "[]");
    const itemsStr = items.map((i) => `${i.name} (${i.size})`).join(", ");
    const totalQty = items.reduce((sum, i) => sum + i.quantity, 0);

    const row = [
      data.timestamp || new Date().toISOString(),
      data.orderId,
      itemsStr,
      totalQty,
      data.subtotal,
      data.total,
      data.customer.firstName,
      data.customer.lastName,
      data.customer.phone,
      data.customer.wilaya,
      data.customer.address,
      data.customer.notes || "",
      data.utm?.utm_source || "",
      data.utm?.utm_medium || "",
      data.utm?.utm_campaign || "",
      JSON.stringify(data), // Raw JSON for debugging
    ];

    // Append row
    sheet.appendRow(row);

    return ContentService.createTextOutput(
      JSON.stringify({
        success: true,
        orderId: data.orderId,
      }),
    ).setMimeType(ContentService.MimeType.JSON);
  } catch (error) {
    return ContentService.createTextOutput(
      JSON.stringify({
        success: false,
        error: error.toString(),
      }),
    ).setMimeType(ContentService.MimeType.JSON);
  }
}

// Test function (optional)
function testDoPost() {
  const testData = {
    secret: WEBHOOK_SECRET,
    orderId: "ORD-TEST-123",
    timestamp: new Date().toISOString(),
    items: [
      {
        id: "BT-001",
        name: "Black Tee",
        sku: "BT-001",
        size: "M",
        quantity: 2,
        price: 4500,
      },
    ],
    subtotal: 9000,
    total: 9000,
    customer: {
      firstName: "Test",
      lastName: "User",
      phone: "+213612345678",
      wilaya: "Algiers",
      address: "Test Address",
      notes: "Test order",
    },
    utm: {
      utm_source: "test",
      utm_medium: "web",
      utm_campaign: "test",
    },
  };

  const mockEvent = {
    postData: {
      contents: JSON.stringify(testData),
    },
  };

  const result = doPost(mockEvent);
  Logger.log(result.getContent());
}
```

### Step 5: Update `script.js`

1. Copy the Web app URL from Apps Script deployment
2. Paste it into `CONFIG.WEBHOOK_URL` in `script.js`
3. Set `CONFIG.WEBHOOK_SECRET` to match `WEBHOOK_SECRET` in Apps Script

### Testing the Webhook

Test your webhook with curl:

```bash
curl -X POST "YOUR_WEBHOOK_URL" \
  -H "Content-Type: application/json" \
  -d '{
    "secret": "your-secret-key-change-this",
    "orderId": "ORD-TEST-123",
    "timestamp": "2026-02-17T10:00:00Z",
    "items": [
      {"id": "BT-001", "name": "Black Tee", "sku": "BT-001", "size": "M", "quantity": 1, "price": 4500}
    ],
    "subtotal": 4500,
    "total": 4500,
    "customer": {
      "firstName": "Test",
      "lastName": "User",
      "phone": "+213612345678",
      "wilaya": "Algiers",
      "address": "123 Test St",
      "notes": ""
    },
    "utm": {
      "utm_source": "test",
      "utm_medium": "web",
      "utm_campaign": "test"
    }
  }'
```

Expected response: `{"success":true,"orderId":"ORD-TEST-123"}`

## Order JSON Payload Format

The site sends orders in this exact format:

```json
{
  "secret": "your-secret-key",
  "orderId": "ORD-1234567890",
  "timestamp": "2026-02-17T10:00:00.000Z",
  "items": [
    {
      "id": "BT-001",
      "name": "Black Tee",
      "sku": "BT-001",
      "size": "M",
      "quantity": 2,
      "price": 4500
    }
  ],
  "subtotal": 9000,
  "total": 9000,
  "customer": {
    "firstName": "Ali",
    "lastName": "Ben",
    "phone": "+2136XXXXXXXX",
    "wilaya": "Algiers",
    "address": "Street 1, City",
    "notes": "Leave at door"
  },
  "utm": {
    "utm_source": "facebook",
    "utm_medium": "social",
    "utm_campaign": "summer_sale"
  }
}
```

**Note:** The `utm` object is only included if `CONFIG.UTM_CAPTURE` is `true`.

## Deep Linking for Ads

The site supports product deep-linking via URL parameters:

- **Single product**: `https://yoursite.com/?product=BT-001`
- **With UTM**: `https://yoursite.com/?product=BT-001&utm_source=facebook&utm_medium=social&utm_campaign=summer`

When a user visits with `?product=<id>`, the product modal opens automatically.

## Test Cases

### 1. Add to Cart

- **Test**: Click "Add to Cart" on a product without sizes
- **Expected**: Item appears in cart, counter updates
- **Test**: Click "Add to Cart" on a product with sizes
- **Expected**: Product modal opens requiring size selection

### 2. Cart Persistence

- **Test**: Add items to cart, refresh page
- **Expected**: Cart items remain, counter shows correct count

### 3. Size Required

- **Test**: Try to add a product with sizes without selecting size
- **Expected**: Modal shows validation error, size field focused

### 4. Inventory Limits

- **Test**: Try to add quantity exceeding inventory
- **Expected**: Addition fails, user notified

### 5. Form Validation

- **Test**: Submit checkout form with empty required fields
- **Expected**: First invalid field focused, error shown
- **Test**: Enter invalid phone (less than 7 digits)
- **Expected**: Phone validation error shown

### 6. Webhook Success

- **Test**: Submit valid order
- **Expected**: Success modal shows order ID, cart cleared, order appears in Google Sheet

### 7. Webhook Failure

- **Test**: Submit order with invalid webhook URL
- **Expected**: Error message shown, order queued in localStorage for retry

### 8. UTM Capture

- **Test**: Visit with `?utm_source=test&utm_medium=web&utm_campaign=test`
- **Test**: Submit order
- **Expected**: UTM parameters included in order payload (if `UTM_CAPTURE: true`)

### 9. Search & Filter

- **Test**: Type in search box
- **Expected**: Results filter after 300ms debounce
- **Test**: Select category/size/price filters
- **Expected**: Results update immediately

### 10. Mobile Responsiveness

- **Test**: View on mobile device (< 640px width)
- **Expected**: Single column layout, touch-friendly buttons, modals full-screen

## Features

- ✅ Mobile-first responsive design
- ✅ Product catalog with images, prices, descriptions
- ✅ Size/variant selection
- ✅ Shopping cart with localStorage persistence
- ✅ Client-side search & filtering
- ✅ Deep-linking for ad campaigns (`?product=<id>`)
- ✅ UTM parameter capture
- ✅ Checkout form with validation
- ✅ Google Sheets integration via webhook
- ✅ Retry logic with exponential backoff
- ✅ Failed order queuing
- ✅ Accessibility (ARIA, keyboard navigation, reduced motion)
- ✅ No shipping fields or fees

## Browser Support

- Chrome/Edge (latest)
- Firefox (latest)
- Safari (latest)
- Mobile browsers (iOS Safari, Chrome Mobile)

## Notes

- **No shipping fees**: The site does not include shipping fields or fees anywhere
- **No payment processing**: Orders are submitted as form data only
- **Static site**: No server-side code required, works with any static hosting
- **LocalStorage**: Cart persists in browser localStorage under key `store_cart_v1`
- **Failed orders**: Stored in localStorage under `store_failed_orders` for manual retry

## Troubleshooting

### Products not showing

- Check browser console for JavaScript errors
- Verify `PRODUCTS` array syntax in `script.js`
- Ensure image URLs are accessible

### Webhook not receiving orders

- Verify `WEBHOOK_URL` is correct in `CONFIG`
- Check Apps Script execution logs
- Ensure `WEBHOOK_SECRET` matches in both files
- Test webhook with curl (see Testing section)

### Cart not persisting

- Check browser localStorage is enabled
- Verify no browser extensions blocking localStorage
- Check console for errors

### Deep linking not working

- Verify URL parameter is `?product=<id>` (matches product `id` field)
- Check browser console for errors
- Ensure product ID exists in `PRODUCTS` array
