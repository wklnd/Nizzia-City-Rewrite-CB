Place property images in this folder.

Filenames must match the backend property IDs using this pattern:

  property_<id>.jpg

From backend/config/properties.js, the default IDs are:
  - property_trailer.jpg
  - property_apartment.jpg
  - property_house.jpg
  - property_villa.jpg
  - property_private_island.jpg

Recommendations:
- Aspect ratio: 16:9 (e.g., 1280x720 or 1600x900)
- Format: JPG (current code expects .jpg). You can also use .webp/.png if you update the code.
- Keep file sizes reasonable (<300KB) for faster loads.

These images are served statically by Vite from the public/ directory and referenced in code as:
  /assets/images/property_<id>.jpg


// This part has been generated using AI. errors may occur. 