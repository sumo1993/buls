# Registration Page Styling - Liberian Colors Theme

## 🎨 Design Overview
The registration page now features a beautiful diagonal stripe pattern using the Liberian flag colors:
- **Blue** (#00205B) - Liberian flag blue
- **White** (#FFFFFF) - Liberian flag white  
- **Red** (#EF3340) - Liberian flag red

## ✨ Changes Made

### 1. **Background Pattern**
Created a diagonal stripe pattern that repeats across the entire page:
```css
background: linear-gradient(135deg, 
  #00205B 0%,  /* Blue stripe */
  #00205B 25%, 
  #FFFFFF 25%, /* White stripe */
  #FFFFFF 50%, 
  #EF3340 50%, /* Red stripe */
  #EF3340 75%,
  #00205B 75%, /* Blue stripe */
  #00205B 100%
)
backgroundSize: '80px 80px' /* Creates repeating pattern */
```

### 2. **Overlay for Readability**
Added a subtle gradient overlay to ensure text remains readable:
```css
background: gradient from blue-900/30 via transparent to red-900/30
```

### 3. **Header Card Styling**
- **Background**: White with 95% opacity and backdrop blur
- **Border**: 4px white border with rounded corners
- **Shadow**: Heavy drop shadow for depth
- **Text Colors**:
  - Title: Liberian Blue (#00205B)
  - Subtitle: Liberian Red (#EF3340)
  - Description: Gray for readability

### 4. **Form Card Enhancement**
- **Background**: White with 98% opacity and backdrop blur
- **Border**: 4px Liberian Blue border
- **Corners**: Rounded (2xl)
- **Shadow**: 2xl shadow for elevation

## 🎯 Visual Effect

The page now displays:
1. **Repeating diagonal stripes** in Liberian flag colors (blue, white, red)
2. **Clean white cards** that float above the pattern
3. **Professional contrast** between background and content
4. **Subtle transparency** for a modern glassmorphism effect
5. **Strong Liberian identity** through color scheme

## 📱 Responsive Design

The pattern scales beautifully across all devices:
- Mobile: Smaller stripe pattern for better mobile view
- Tablet: Medium-sized pattern
- Desktop: Full-sized diagonal stripes

## 🌟 Professional Touch

- ✅ Patriotic colors representing Liberia
- ✅ Modern glassmorphism with backdrop blur
- ✅ Clean, professional white cards
- ✅ Excellent text readability
- ✅ Eye-catching diagonal pattern
- ✅ Consistent with BULS branding

## Color Reference

| Color | Hex Code | Usage |
|-------|----------|-------|
| Liberian Blue | #00205B | Primary color, borders, headers |
| Liberian Red | #EF3340 | Accent color, subtitles |
| White | #FFFFFF | Card backgrounds, stripes |

## Files Modified
- `app/registration/page.tsx` - Added Liberian-themed background pattern

## Before vs After

**Before**: 
- Simple gradient background (blue to red)
- White text on gradient (less readable)

**After**:
- Diagonal stripe pattern with Liberian colors
- White cards with backdrop blur
- Blue and red text on white (highly readable)
- More professional and patriotic appearance
