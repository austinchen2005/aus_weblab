# How to Add Background Images

## Where to Find Free Background Images:

1. **Unsplash** (https://unsplash.com/)
   - High-quality, free photos
   - Search for: "poker", "cards", "casino", "gaming", etc.
   - No attribution required

2. **Pexels** (https://www.pexels.com/)
   - Free stock photos
   - Good search: "poker cards", "gaming", "casino"

3. **Pixabay** (https://pixabay.com/)
   - Free images and vectors
   - Search for card/poker themes

## How to Add Background Images:

### Option 1: Add to public folder (Recommended)
1. Create a `public` folder in `client/src/` if it doesn't exist
2. Add your image file (e.g., `background.jpg`)
3. In your CSS file, add:

```css
.page-container {
  background-image: 
    url('/src/public/background.jpg'),
    linear-gradient(135deg, rgba(44, 62, 80, 0.1) 0%, transparent 50%);
  background-size: cover;
  background-position: center;
  background-blend-mode: overlay;
}
```

### Option 2: Use online URL
```css
.page-container {
  background-image: 
    url('https://images.unsplash.com/photo-xxx'),
    linear-gradient(135deg, rgba(44, 62, 80, 0.1) 0%, transparent 50%);
  background-size: cover;
  background-position: center;
}
```

### Option 3: Import in component
1. Add image to `client/src/assets/` folder
2. Import in your component:
```jsx
import backgroundImage from '../assets/background.jpg';
```
3. Use inline style:
```jsx
<div className="page-container" style={{backgroundImage: `url(${backgroundImage})`}}>
```

## Tips:
- Use `background-size: cover` to fill the entire area
- Use `background-position: center` to center the image
- Add `background-blend-mode: overlay` to blend with colors
- Use opacity/overlay gradients to ensure text remains readable
