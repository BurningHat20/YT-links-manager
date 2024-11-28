# 🎥 YouTube Content Manager

A powerful, AI-driven application for organizing and managing YouTube content with automatic categorization and tagging capabilities.

## 📸 Preview

### Desktop View

![Desktop Grid View](https://res.cloudinary.com/dlxlhnxkh/image/upload/v1732819726/Screenshot_2024-11-29_001510_bzg3uy.png)
_Grid View: Organize and view your YouTube content in a visual grid layout_

![Desktop List View](https://res.cloudinary.com/dlxlhnxkh/image/upload/v1732819726/Screenshot_2024-11-29_001623_bgykut.png)
_List View: Detailed list view with comprehensive video information_

### Mobile Experience

<p align="center">
  <img src="https://res.cloudinary.com/dlxlhnxkh/image/upload/v1732819726/Screenshot_2024-11-29_001734_xckiab.png" alt="Mobile View" width="300"/>
  <img src="https://res.cloudinary.com/dlxlhnxkh/image/upload/v1732819725/Screenshot_2024-11-29_001744_f8w0ix.png" alt="Mobile Menu" width="300"/>
</p>
*Responsive mobile design with intuitive navigation*

### Features Showcase

![Bulk Import](https://res.cloudinary.com/dlxlhnxkh/image/upload/v1732819726/Screenshot_2024-11-29_001821_oldo1v.png)
_Bulk Import: Add multiple videos simultaneously_

## ✨ Features

- **AI-Powered Categorization**: Automatically categorizes videos using advanced AI analysis
- **Smart Tagging**: Generates relevant tags for easy content organization
- **Bulk Import**: Add multiple YouTube videos simultaneously
- **Flexible Views**: Switch between grid and list views for content browsing
- **Advanced Search**: Search through videos by title, tags, or categories
- **Analytics Dashboard**: View comprehensive statistics about your video collection
- **Confidence Scoring**: AI confidence ratings for categorization accuracy
- **Responsive Design**: Fully functional on both desktop and mobile devices

## 🚀 Tech Stack

- **Frontend**: React.js with modern Hooks and custom components
- **UI Components**: ShadcnUI for sleek, accessible interface elements
- **Icons**: Lucide React for consistent iconography
- **Backend**: Supabase for real-time database and authentication
- **AI Integration**: GROQ API for intelligent content analysis
- **API Integration**: YouTube Data API v3 for video metadata

## 📋 Prerequisites

Before you begin, ensure you have:

- Node.js (v16 or higher)
- npm or yarn package manager
- Supabase account
- YouTube Data API key
- GROQ API key

## ⚙️ Environment Variables

Create a `.env` file in the root directory with:

```plaintext
VITE_YOUTUBE_API_KEY=your_youtube_api_key
VITE_GROQ_API_KEY=your_groq_api_key
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

## 🛠️ Installation

1. Clone the repository:

```bash
git clone https://github.com/BurningHat20/YT-links-manager.git
cd YT-links-manager
```

2. Install dependencies:

```bash
npm install
# or
yarn install
```

3. Start the development server:

```bash
npm run dev
# or
yarn dev
```

## 💾 Database Setup

The application requires a Supabase database with the following table structure:

```sql
create table youtube_links (
  id uuid default uuid_generate_v4() primary key,
  url text not null,
  video_id text not null,
  timestamp timestamptz default now(),
  title text not null,
  thumbnail text,
  description text,
  main_category text,
  sub_categories text[],
  tags text[],
  confidence float
);
```

## 🎯 Usage

1. **Adding Videos**:
   - Paste a YouTube URL in the quick add input
   - Or use bulk import for multiple videos
2. **Organizing Content**:
   - Browse videos by category
   - Use the search bar to find specific content
   - Switch between grid and list views
3. **Managing Videos**:
   - View detailed information for each video
   - Delete unwanted entries
   - Export your video database

## 📱 Mobile Support

The application is fully responsive and includes:

- Mobile-optimized navigation
- Touch-friendly interface
- Adaptive layouts for different screen sizes

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request. For major changes, please open an issue first to discuss what you would like to change.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- [Shadcn UI](https://ui.shadcn.com/) for the beautiful component library
- [Lucide Icons](https://lucide.dev/) for the icon set
- [Supabase](https://supabase.com/) for the backend infrastructure
- [GROQ](https://groq.com/) for AI capabilities

## 📞 Support

For support, please open an issue in the GitHub repository or contact [burninghat20@gmail.com]

---

Made with ❤️ by [BurningHat]
