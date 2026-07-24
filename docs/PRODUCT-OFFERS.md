# Product & Offer Finder

`product-offers.json` is the publishing source for the B2B BUY product shelf. It lets Birdland publish product information as view-only OneDrive or SharePoint PDF links without editing the generated `partner.html`.

## Publish or replace a PDF

1. Upload the PDF to the Birdland OneDrive or SharePoint folder used for customer-facing files.
2. Create a share link that allows the intended customers to **view** the file. Do not grant edit access.
3. Test the link in a private browser window. It must open without exposing any private folder or requiring an unintended account.
4. Add or update the matching item in `product-offers.json`.
5. Set `updated` to the publication date and keep `status` as `published` only when the link has been checked.
6. Preview `partner.html#p-offers` locally before publishing the website.

The page fetches `product-offers.json` at runtime, so the HTML template does not need a new hard-coded product card. A website commit and approved deployment are still required when the JSON file itself changes.

## Item fields

- `id`: stable lowercase identifier; do not reuse it for a different product.
- `type`: for example `catalogue`, `product`, or `report`.
- `title`: customer-facing name.
- `subtitle`: one short sentence describing what the PDF contains.
- `category`: Product Finder filter label.
- `origin`: factual origin or `Birdland supply network` when the PDF covers multiple origins.
- `availability`: factual status such as `Current catalogue` or a confirmed validity date.
- `pdf_url`: HTTPS view-only OneDrive or SharePoint link.
- `cover_image`: same-origin website image used as the card cover.
- `featured`: `true` for the first-page shelf.
- `status`: only `published` items are shown.

## Safety rules

- Never publish a private folder link, edit link, expiring download token, customer-specific quote, price agreement, or personal information.
- Do not label a PDF as current unless Birdland has checked the link and content.
- The website opens the PDF in a new tab and does not pretend that a download, enquiry, or order has completed.
- If the JSON or link is unavailable, the Product Finder shows an honest unavailable state instead of substitute products.
