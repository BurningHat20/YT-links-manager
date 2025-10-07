import React, { useState, useEffect, useMemo } from "react";
import { Client, Databases, Query } from "appwrite";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  CardFooter,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { Progress } from "@/components/ui/progress";
import {
  Plus,
  Trash2,
  FolderOpen,
  Loader2,
  Download,
  Upload,
  Search,
  BarChart,
  LayoutGrid,
  List,
  Info,
  Menu,
  X,
  Sparkles,
  Calendar,
  Tag,
  TrendingUp,
  Eye,
  ExternalLink,
} from "lucide-react";

// Environment variables and Appwrite setup
const YOUTUBE_API_KEY = import.meta.env.VITE_YOUTUBE_API_KEY;
const GROQ_API_KEY = import.meta.env.VITE_GROQ_API_KEY;
const APPWRITE_PROJECT_ID = import.meta.env.VITE_APPWRITE_PROJECT_ID;
const APPWRITE_DATABASE_ID = import.meta.env.VITE_APPWRITE_DATABASE_ID;
const APPWRITE_COLLECTION_ID = import.meta.env.VITE_APPWRITE_COLLECTION_ID;
const APPWRITE_ENDPOINT = import.meta.env.VITE_APPWRITE_ENDPOINT;

// Initialize Appwrite client
const client = new Client()
  .setEndpoint(APPWRITE_ENDPOINT)
  .setProject(APPWRITE_PROJECT_ID);

const databases = new Databases(client);

const App = () => {
  // State management
  const [links, setLinks] = useState([]);
  const [newLink, setNewLink] = useState("");
  const [bulkLinks, setBulkLinks] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterCategory, setFilterCategory] = useState("all");
  const [sortBy, setSortBy] = useState("date");
  const [stats, setStats] = useState(null);
  const [showStats, setShowStats] = useState(false);
  const [showBulkAdd, setShowBulkAdd] = useState(false);
  const [processedCount, setProcessedCount] = useState(0);
  const [totalToProcess, setTotalToProcess] = useState(0);
  const [viewMode, setViewMode] = useState("grid");
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isInitialLoading, setIsInitialLoading] = useState(true);

  // Initialize app
  useEffect(() => {
    fetchLinks();
  }, []);

  useEffect(() => {
    calculateStats();
  }, [links]);

  const fetchLinks = async () => {
    try {
      setIsInitialLoading(true);
      const response = await databases.listDocuments(
        APPWRITE_DATABASE_ID,
        APPWRITE_COLLECTION_ID,
        [Query.orderDesc("timestamp"), Query.limit(100)]
      );

      setLinks(response.documents || []);
    } catch (error) {
      console.error("Error fetching links:", error);
      setError("Failed to load links. Please check your configuration.");
    } finally {
      setIsInitialLoading(false);
    }
  };

  const calculateStats = () => {
    if (!links.length) return;

    const stats = {
      totalVideos: links.length,
      categoriesCount: {},
      tagsCount: {},
      monthlyAdditions: {},
      averageConfidence: 0,
      topTags: [],
      topCategories: [],
      recentAdditions: 0,
    };

    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

    links.forEach((link) => {
      // Count categories
      const category = link.main_category || "Uncategorized";
      stats.categoriesCount[category] =
        (stats.categoriesCount[category] || 0) + 1;

      // Count tags
      if (link.tags && Array.isArray(link.tags)) {
        link.tags.forEach((tag) => {
          stats.tagsCount[tag] = (stats.tagsCount[tag] || 0) + 1;
        });
      }

      // Monthly additions
      const month = new Date(link.timestamp).toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
      });
      stats.monthlyAdditions[month] = (stats.monthlyAdditions[month] || 0) + 1;

      // Average confidence
      stats.averageConfidence += link.confidence || 0;

      // Recent additions
      if (new Date(link.timestamp) > oneWeekAgo) {
        stats.recentAdditions++;
      }
    });

    stats.averageConfidence = (
      (stats.averageConfidence / links.length) *
      100
    ).toFixed(1);

    // Top tags
    stats.topTags = Object.entries(stats.tagsCount)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([tag, count]) => ({ tag, count }));

    // Top categories
    stats.topCategories = Object.entries(stats.categoriesCount)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 3)
      .map(([category, count]) => ({ category, count }));

    setStats(stats);
  };

  const extractVideoId = (url) => {
    const regExp =
      /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
    const match = url.match(regExp);
    return match && match[2].length === 11 ? match[2] : null;
  };

  const fetchVideoDetails = async (videoId) => {
    try {
      const response = await fetch(
        `https://www.googleapis.com/youtube/v3/videos?id=${videoId}&key=${YOUTUBE_API_KEY}&part=snippet,statistics`
      );

      if (!response.ok) {
        throw new Error(`YouTube API error: ${response.status}`);
      }

      const data = await response.json();
      if (!data.items?.[0]?.snippet) {
        throw new Error("Video not found or API error");
      }

      return {
        snippet: data.items[0].snippet,
        statistics: data.items[0].statistics,
      };
    } catch (error) {
      console.error("YouTube API error:", error);
      throw error;
    }
  };

  const analyzeWithGroq = async (videoDetails) => {
    const prompt = `
      Analyze this YouTube video content and categorize it:
      
      Title: ${videoDetails.snippet.title}
      Description: ${
        videoDetails.snippet.description?.substring(0, 500) || "No description"
      }
      Channel: ${videoDetails.snippet.channelTitle}
      View Count: ${videoDetails.statistics?.viewCount || "Unknown"}
      
      Provide a JSON response with the following structure:
      {
        "mainCategory": "single most relevant category from: Technology, Education, Entertainment, Music, Gaming, Sports, News, Lifestyle, Business, Science, Art, Comedy, Travel, Food, Health, DIY, Review, Tutorial, Vlog, Other",
        "subCategories": ["up to 3 related subcategories"],
        "tags": ["up to 6 relevant keywords/tags"],
        "confidence": 0.95
      }
    `;

    try {
      const response = await fetch(
        "https://api.groq.com/openai/v1/chat/completions",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${GROQ_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            messages: [
              {
                role: "system",
                content:
                  "You are an AI assistant that analyzes YouTube videos and provides accurate categorization with relevant tags. Always respond with valid JSON. Be precise and consistent with categories.",
              },
              {
                role: "user",
                content: prompt,
              },
            ],
            // changed model from llama 3 8b to gpt-oss-20b
            model: "openai/gpt-oss-20b",
            temperature: 0.3,
            response_format: { type: "json_object" },
          }),
        }
      );

      if (!response.ok) {
        throw new Error(`Groq API error: ${response.status}`);
      }

      const data = await response.json();
      const analysis = JSON.parse(data.choices[0].message.content);

      // Validate the response structure
      if (
        !analysis.mainCategory ||
        !analysis.tags ||
        !Array.isArray(analysis.tags)
      ) {
        throw new Error("Invalid AI response format");
      }

      return analysis;
    } catch (error) {
      console.error("Groq API error:", error);
      // Fallback to basic categorization
      return {
        mainCategory: "Other",
        subCategories: [],
        tags: ["video", "content"],
        confidence: 0.5,
      };
    }
  };

  const processVideoLink = async (url) => {
    const videoId = extractVideoId(url);
    if (!videoId) {
      throw new Error("Invalid YouTube URL");
    }

    // Check if video already exists
    try {
      const existingVideos = await databases.listDocuments(
        APPWRITE_DATABASE_ID,
        APPWRITE_COLLECTION_ID,
        [Query.equal("video_id", videoId)]
      );

      if (existingVideos.documents.length > 0) {
        throw new Error("Video already exists in your collection");
      }
    } catch (error) {
      if (error.message.includes("already exists")) {
        throw error;
      }
      // Continue if it's just a query error
    }

    const videoDetails = await fetchVideoDetails(videoId);
    const aiAnalysis = await analyzeWithGroq(videoDetails);

    const linkData = {
      url,
      video_id: videoId,
      timestamp: new Date().toISOString(),
      title: videoDetails.snippet.title,
      thumbnail:
        videoDetails.snippet.thumbnails.high?.url ||
        videoDetails.snippet.thumbnails.medium?.url,
      description: videoDetails.snippet.description || "",
      main_category: aiAnalysis.mainCategory,
      sub_categories: aiAnalysis.subCategories || [],
      tags: aiAnalysis.tags || [],
      confidence: aiAnalysis.confidence || 0.5,
      channel_title: videoDetails.snippet.channelTitle,
      view_count: parseInt(videoDetails.statistics?.viewCount || "0"),
      published_at: videoDetails.snippet.publishedAt,
    };

    const response = await databases.createDocument(
      APPWRITE_DATABASE_ID,
      APPWRITE_COLLECTION_ID,
      "unique()",
      linkData
    );

    return response;
  };

  const handleAddLink = async () => {
    setError(null);
    if (!newLink.trim()) return;

    setIsProcessing(true);
    try {
      const newLinkObj = await processVideoLink(newLink.trim());
      setLinks((prev) => [newLinkObj, ...prev]);
      setNewLink("");
    } catch (error) {
      console.error("Error:", error);
      setError(error.message || "Failed to process video. Please try again.");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleBulkAdd = async () => {
    setError(null);
    if (!bulkLinks.trim()) return;

    setIsProcessing(true);
    const urls = bulkLinks
      .split(/[\n\r]+/)
      .map((url) => url.trim())
      .filter((url) => url.length > 0);

    setTotalToProcess(urls.length);
    setProcessedCount(0);

    try {
      const newLinks = [];
      const errors = [];

      for (let i = 0; i < urls.length; i++) {
        const url = urls[i];
        try {
          const newLink = await processVideoLink(url);
          newLinks.push(newLink);
          setProcessedCount((prev) => prev + 1);

          // Add a small delay to avoid rate limiting
          if (i < urls.length - 1) {
            await new Promise((resolve) => setTimeout(resolve, 1000));
          }
        } catch (error) {
          console.error(`Error processing ${url}:`, error);
          errors.push(`${url}: ${error.message}`);
          setProcessedCount((prev) => prev + 1);
        }
      }

      setLinks((prev) => [...newLinks, ...prev]);
      setBulkLinks("");
      setShowBulkAdd(false);

      if (errors.length > 0) {
        setError(
          `Some videos failed to process:\n${errors.slice(0, 3).join("\n")}${
            errors.length > 3 ? `\n...and ${errors.length - 3} more` : ""
          }`
        );
      }
    } catch (error) {
      console.error("Error:", error);
      setError("Failed to process videos. Please try again.");
    } finally {
      setIsProcessing(false);
      setTotalToProcess(0);
      setProcessedCount(0);
    }
  };

  const handleExport = () => {
    const exportData = {
      exported_at: new Date().toISOString(),
      total_videos: links.length,
      videos: links.map((link) => ({
        title: link.title,
        url: link.url,
        category: link.main_category,
        tags: link.tags,
        confidence: link.confidence,
        added_at: link.timestamp,
        channel: link.channel_title,
        view_count: link.view_count,
      })),
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `youtube_collection_${
      new Date().toISOString().split("T")[0]
    }.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const removeLink = async (id) => {
    try {
      await databases.deleteDocument(
        APPWRITE_DATABASE_ID,
        APPWRITE_COLLECTION_ID,
        id
      );

      setLinks((prev) => prev.filter((link) => link.$id !== id));
    } catch (error) {
      console.error("Error removing link:", error);
      setError("Failed to remove link");
    }
  };

  // Filter and sort links
  const filteredAndSortedLinks = useMemo(() => {
    let result = [...links];

    // Filter by search term
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      result = result.filter(
        (link) =>
          link.title?.toLowerCase().includes(term) ||
          link.tags?.some((tag) => tag.toLowerCase().includes(term)) ||
          link.main_category?.toLowerCase().includes(term) ||
          link.channel_title?.toLowerCase().includes(term)
      );
    }

    // Filter by category
    if (filterCategory !== "all") {
      result = result.filter((link) => link.main_category === filterCategory);
    }

    // Sort
    switch (sortBy) {
      case "date":
        result.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
        break;
      case "title":
        result.sort((a, b) => a.title?.localeCompare(b.title || "") || 0);
        break;
      case "confidence":
        result.sort((a, b) => (b.confidence || 0) - (a.confidence || 0));
        break;
      case "views":
        result.sort((a, b) => (b.view_count || 0) - (a.view_count || 0));
        break;
      case "channel":
        result.sort(
          (a, b) => a.channel_title?.localeCompare(b.channel_title || "") || 0
        );
        break;
    }

    return result;
  }, [links, searchTerm, filterCategory, sortBy]);

  // Group links by category
  const categorizedLinks = useMemo(() => {
    return filteredAndSortedLinks.reduce((acc, link) => {
      const category = link.main_category || "Uncategorized";
      if (!acc[category]) {
        acc[category] = [];
      }
      acc[category].push(link);
      return acc;
    }, {});
  }, [filteredAndSortedLinks]);

  const allCategories = useMemo(() => {
    const categories = new Set(
      links.map((link) => link.main_category).filter(Boolean)
    );
    return ["all", ...Array.from(categories).sort()];
  }, [links]);

  const formatNumber = (num) => {
    if (!num) return "0";
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toString();
  };

  if (isInitialLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">
            Loading your video collection...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Mobile Header */}
      <div className="lg:hidden fixed top-0 left-0 right-0 bg-background/95 backdrop-blur-sm border-b z-50">
        <div className="flex items-center justify-between p-4">
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            <h1 className="text-lg font-semibold">YT Manager</h1>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-xs">
              {links.length} videos
            </Badge>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsMobileMenuOpen(true)}
            >
              <Menu className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </div>

      {/* Mobile Navigation Sheet */}
      <Sheet open={isMobileMenuOpen} onOpenChange={setIsMobileMenuOpen}>
        <SheetContent side="left" className="w-[280px] sm:w-[320px] p-0">
          <SheetHeader className="p-6 border-b">
            <SheetTitle className="flex items-center gap-2">
              <FolderOpen className="h-5 w-5" />
              Categories
            </SheetTitle>
          </SheetHeader>
          <div className="py-4">
            {allCategories.map((category) => {
              const count =
                category === "all"
                  ? links.length
                  : links.filter((link) => link.main_category === category)
                      .length;

              return (
                <button
                  key={category}
                  onClick={() => {
                    setFilterCategory(category);
                    setIsMobileMenuOpen(false);
                  }}
                  className={`w-full text-left px-6 py-3 transition ${
                    filterCategory === category
                      ? "bg-muted text-primary border-r-2 border-primary"
                      : "text-foreground hover:bg-muted/50"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <FolderOpen className="h-4 w-4 mr-3" />
                      <span className="font-medium capitalize">{category}</span>
                    </div>
                    <Badge variant="outline" className="text-xs">
                      {count}
                    </Badge>
                  </div>
                </button>
              );
            })}
          </div>
        </SheetContent>
      </Sheet>

      {/* Desktop Sidebar */}
      <aside className="hidden lg:block w-64 bg-background/80 backdrop-blur-sm h-screen fixed left-0 top-0 border-r">
        <div className="p-6 border-b">
          <div className="flex items-center gap-2 mb-4">
            <Sparkles className="h-5 w-5 text-primary" />
            <h1 className="text-xl font-bold">YT Manager</h1>
          </div>
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <span className="flex items-center gap-1">
              <Eye className="h-4 w-4" />
              {links.length} videos
            </span>
            {stats && (
              <span className="flex items-center gap-1">
                <TrendingUp className="h-4 w-4" />
                {stats.averageConfidence}% avg
              </span>
            )}
          </div>
        </div>

        <nav className="p-4">
          <div className="space-y-1">
            {allCategories.map((category) => {
              const count =
                category === "all"
                  ? links.length
                  : links.filter((link) => link.main_category === category)
                      .length;

              return (
                <button
                  key={category}
                  onClick={() => setFilterCategory(category)}
                  className={`w-full text-left px-4 py-2 rounded-md transition ${
                    filterCategory === category
                      ? "bg-muted text-primary"
                      : "hover:bg-muted/50"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <FolderOpen
                        className={`h-4 w-4 mr-3 ${
                          filterCategory === category
                            ? "text-primary"
                            : "text-muted-foreground"
                        }`}
                      />
                      <span className="font-medium capitalize">{category}</span>
                    </div>
                    <Badge
                      variant={
                        filterCategory === category ? "default" : "outline"
                      }
                      className="text-xs"
                    >
                      {count}
                    </Badge>
                  </div>
                </button>
              );
            })}
          </div>
        </nav>
      </aside>

      {/* Main Content */}
      <main className="lg:ml-64 pt-[72px] lg:pt-0">
        <div className="p-4 lg:p-6">
          {/* Header Actions */}
          <div className="flex flex-col lg:flex-row gap-4 lg:items-center lg:justify-between mb-6">
            <div className="flex-1 max-w-xl">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  type="text"
                  placeholder="Search videos, tags, channels..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue placeholder="Sort by" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="date">Latest First</SelectItem>
                  <SelectItem value="title">Title A-Z</SelectItem>
                  <SelectItem value="confidence">Confidence</SelectItem>
                  <SelectItem value="views">View Count</SelectItem>
                  <SelectItem value="channel">Channel</SelectItem>
                </SelectContent>
              </Select>

              <Button
                variant="outline"
                size="icon"
                onClick={() =>
                  setViewMode(viewMode === "grid" ? "list" : "grid")
                }
              >
                {viewMode === "grid" ? (
                  <List className="h-4 w-4" />
                ) : (
                  <LayoutGrid className="h-4 w-4" />
                )}
              </Button>

              <Button
                variant="outline"
                size="icon"
                onClick={() => setShowStats(!showStats)}
              >
                <BarChart className="h-4 w-4" />
              </Button>

              <Button variant="outline" size="icon" onClick={handleExport}>
                <Download className="h-4 w-4" />
              </Button>

              <Button onClick={() => setShowBulkAdd(true)}>
                <Plus className="h-4 w-4 mr-2" />
                <span className="hidden sm:inline">Add Videos</span>
              </Button>
            </div>
          </div>

          {/* Quick Add Section */}
          <Card className="mb-6">
            <CardContent className="p-4 pt-4">
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="flex-1 relative">
                  <Input
                    type="text"
                    value={newLink}
                    onChange={(e) => setNewLink(e.target.value)}
                    placeholder="Paste YouTube link here..."
                    onKeyPress={(e) =>
                      e.key === "Enter" && !isProcessing && handleAddLink()
                    }
                  />
                  {newLink && (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setNewLink("")}
                      className="absolute right-1 top-1/2 transform -translate-y-1/2 h-7 w-7"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                </div>
                <Button
                  onClick={handleAddLink}
                  disabled={isProcessing || !newLink.trim()}
                  className="sm:w-auto w-full"
                >
                  {isProcessing ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      Processing...
                    </>
                  ) : (
                    <>
                      <Plus className="h-4 w-4 mr-2" />
                      Add Video
                    </>
                  )}
                </Button>
              </div>
              {error && (
                <div className="mt-3 p-3 bg-destructive/10 text-destructive rounded-md text-sm">
                  {error}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Statistics Overview */}
          {showStats && stats && (
            <div className="mb-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">
                        Total Videos
                      </p>
                      <h3 className="text-2xl font-bold mt-1">
                        {stats.totalVideos}
                      </h3>
                    </div>
                    <div className="h-10 w-10 bg-primary/10 rounded-full flex items-center justify-center">
                      <Eye className="h-5 w-5 text-primary" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">
                        Avg Confidence
                      </p>
                      <h3 className="text-2xl font-bold mt-1">
                        {stats.averageConfidence}%
                      </h3>
                    </div>
                    <div className="h-10 w-10 bg-primary/10 rounded-full flex items-center justify-center">
                      <Sparkles className="h-5 w-5 text-primary" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">
                        Categories
                      </p>
                      <h3 className="text-2xl font-bold mt-1">
                        {Object.keys(stats.categoriesCount).length}
                      </h3>
                    </div>
                    <div className="h-10 w-10 bg-primary/10 rounded-full flex items-center justify-center">
                      <FolderOpen className="h-5 w-5 text-primary" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">
                        This Week
                      </p>
                      <h3 className="text-2xl font-bold mt-1">
                        {stats.recentAdditions}
                      </h3>
                    </div>
                    <div className="h-10 w-10 bg-primary/10 rounded-full flex items-center justify-center">
                      <TrendingUp className="h-5 w-5 text-primary" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Top Tags */}
              <Card className="sm:col-span-2">
                <CardHeader className="pb-2">
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <Tag className="h-4 w-4" />
                    Top Tags
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-2">
                    {stats.topTags.map(({ tag, count }) => (
                      <Badge key={tag} variant="secondary" className="text-xs">
                        #{tag} ({count})
                      </Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Top Categories */}
              <Card className="sm:col-span-2">
                <CardHeader className="pb-2">
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <BarChart className="h-4 w-4" />
                    Top Categories
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {stats.topCategories.map(({ category, count }) => (
                      <div
                        key={category}
                        className="flex items-center justify-between"
                      >
                        <span className="text-sm font-medium capitalize">
                          {category}
                        </span>
                        <Badge>{count}</Badge>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Empty State */}
          {links.length === 0 && (
            <div className="text-center py-12">
              <div className="h-20 w-20 bg-muted rounded-full flex items-center justify-center mx-auto mb-6">
                <Sparkles className="h-10 w-10 text-muted-foreground" />
              </div>
              <h3 className="text-xl font-semibold mb-2">
                Start Building Your Collection
              </h3>
              <p className="text-muted-foreground mb-6">
                Add YouTube videos and let AI organize them for you
              </p>
              <Button onClick={() => setShowBulkAdd(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Add Your First Videos
              </Button>
            </div>
          )}

          {/* Video Content */}
          {Object.entries(categorizedLinks).map(([category, categoryLinks]) => (
            <div key={category} className="mb-8">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
                <h2 className="text-xl font-semibold flex items-center gap-2">
                  <FolderOpen className="h-5 w-5 text-muted-foreground" />
                  <span className="capitalize">{category}</span>
                  <Badge variant="secondary">{categoryLinks.length}</Badge>
                </h2>
              </div>

              {viewMode === "grid" ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  {categoryLinks.map((link) => (
                    <Card
                      key={link.$id}
                      className="overflow-hidden hover:shadow-md transition-all duration-200"
                    >
                      <div className="relative pb-[56.25%] overflow-hidden">
                        <img
                          src={link.thumbnail}
                          alt={link.title}
                          className="absolute inset-0 w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                          loading="lazy"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />
                        <div className="absolute top-2 right-2 flex gap-2">
                          <Badge className="bg-black/60 text-white border-0 backdrop-blur-sm">
                            {((link.confidence || 0) * 100).toFixed(0)}%
                          </Badge>
                        </div>
                        <div className="absolute bottom-0 left-0 right-0 p-3">
                          <a
                            href={link.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-white font-medium text-sm line-clamp-2 hover:underline"
                          >
                            {link.title}
                          </a>
                        </div>
                      </div>

                      <CardContent className="p-3 space-y-3">
                        <div className="flex items-center justify-between text-xs text-muted-foreground">
                          <div className="flex items-center">
                            <Calendar className="h-3 w-3 mr-1" />
                            {new Date(link.timestamp).toLocaleDateString()}
                          </div>
                          {link.view_count && (
                            <div className="flex items-center">
                              <Eye className="h-3 w-3 mr-1" />
                              {formatNumber(link.view_count)}
                            </div>
                          )}
                        </div>

                        {link.channel_title && (
                          <div className="text-xs text-muted-foreground truncate">
                            {link.channel_title}
                          </div>
                        )}

                        <div className="flex flex-wrap gap-1">
                          {(link.tags || []).slice(0, 3).map((tag, idx) => (
                            <Badge
                              key={idx}
                              variant="secondary"
                              className="text-xs"
                            >
                              #{tag}
                            </Badge>
                          ))}
                          {(link.tags || []).length > 3 && (
                            <Badge variant="outline" className="text-xs">
                              +{(link.tags || []).length - 3}
                            </Badge>
                          )}
                        </div>

                        <div className="flex items-center justify-between pt-2">
                          <Dialog>
                            <DialogTrigger asChild>
                              <Button
                                variant="outline"
                                size="sm"
                                className="h-8 text-xs"
                              >
                                <Info className="h-3 w-3 mr-1" />
                                Details
                              </Button>
                            </DialogTrigger>
                            <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                              <DialogHeader>
                                <DialogTitle>{link.title}</DialogTitle>
                                <DialogDescription>
                                  Video details and AI analysis
                                </DialogDescription>
                              </DialogHeader>
                              <div className="space-y-6 mt-4">
                                <div className="aspect-video">
                                  <img
                                    src={link.thumbnail}
                                    alt={link.title}
                                    className="w-full h-full object-cover rounded-md"
                                  />
                                </div>

                                <div className="grid grid-cols-2 gap-4 text-sm">
                                  <div>
                                    <span className="text-muted-foreground">
                                      Channel:
                                    </span>{" "}
                                    {link.channel_title}
                                  </div>
                                  <div>
                                    <span className="text-muted-foreground">
                                      Views:
                                    </span>{" "}
                                    {formatNumber(link.view_count)}
                                  </div>
                                  <div>
                                    <span className="text-muted-foreground">
                                      Added:
                                    </span>{" "}
                                    {new Date(
                                      link.timestamp
                                    ).toLocaleDateString()}
                                  </div>
                                  <div>
                                    <span className="text-muted-foreground">
                                      Confidence:
                                    </span>{" "}
                                    {((link.confidence || 0) * 100).toFixed(1)}%
                                  </div>
                                </div>

                                {link.description && (
                                  <div>
                                    <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
                                      <Info className="h-4 w-4" />
                                      Description
                                    </h4>
                                    <p className="text-sm text-muted-foreground bg-muted p-3 rounded-md max-h-32 overflow-y-auto">
                                      {link.description.substring(0, 500)}
                                      {link.description.length > 500 && "..."}
                                    </p>
                                  </div>
                                )}

                                <div>
                                  <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
                                    <FolderOpen className="h-4 w-4" />
                                    Categories
                                  </h4>
                                  <div className="flex flex-wrap gap-2">
                                    <Badge>{link.main_category}</Badge>
                                    {(link.sub_categories || []).map(
                                      (subCat, idx) => (
                                        <Badge key={idx} variant="outline">
                                          {subCat}
                                        </Badge>
                                      )
                                    )}
                                  </div>
                                </div>

                                <div>
                                  <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
                                    <Tag className="h-4 w-4" />
                                    Tags
                                  </h4>
                                  <div className="flex flex-wrap gap-2">
                                    {(link.tags || []).map((tag, idx) => (
                                      <Badge key={idx} variant="secondary">
                                        #{tag}
                                      </Badge>
                                    ))}
                                  </div>
                                </div>

                                <DialogFooter className="flex flex-col sm:flex-row gap-3">
                                  <Button
                                    asChild
                                    variant="outline"
                                    className="flex-1"
                                  >
                                    <a
                                      href={link.url}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                    >
                                      <ExternalLink className="h-4 w-4 mr-2" />
                                      Watch on YouTube
                                    </a>
                                  </Button>
                                  <Button
                                    variant="destructive"
                                    onClick={() => removeLink(link.$id)}
                                    className="sm:w-auto"
                                  >
                                    <Trash2 className="h-4 w-4 mr-2" />
                                    Delete
                                  </Button>
                                </DialogFooter>
                              </div>
                            </DialogContent>
                          </Dialog>

                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => removeLink(link.$id)}
                            className="h-8 w-8 text-destructive hover:text-destructive/90 hover:bg-destructive/10"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <div className="space-y-3">
                  {categoryLinks.map((link) => (
                    <Card key={link.$id} className="overflow-hidden">
                      <CardContent className="p-3">
                        <div className="flex flex-col sm:flex-row gap-4">
                          <div className="w-full sm:w-48 h-28 relative flex-shrink-0">
                            <img
                              src={link.thumbnail}
                              alt={link.title}
                              className="absolute inset-0 w-full h-full object-cover rounded-md"
                              loading="lazy"
                            />
                          </div>

                          <div className="flex-1 min-w-0 space-y-2">
                            <div>
                              <a
                                href={link.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-base font-medium hover:text-primary line-clamp-2 transition-colors"
                              >
                                {link.title}
                              </a>
                              {link.channel_title && (
                                <p className="text-xs text-muted-foreground mt-1">
                                  {link.channel_title}
                                </p>
                              )}
                            </div>

                            <div className="flex flex-wrap gap-1">
                              <Badge>{link.main_category}</Badge>
                              {(link.tags || []).slice(0, 3).map((tag, idx) => (
                                <Badge
                                  key={idx}
                                  variant="secondary"
                                  className="text-xs"
                                >
                                  #{tag}
                                </Badge>
                              ))}
                              {(link.tags || []).length > 3 && (
                                <Badge variant="outline" className="text-xs">
                                  +{(link.tags || []).length - 3}
                                </Badge>
                              )}
                            </div>
                          </div>

                          <div className="flex sm:flex-col items-start sm:items-end justify-between sm:justify-start gap-2 sm:w-28">
                            <div className="text-right space-y-1">
                              <Badge variant="outline" className="text-xs">
                                {((link.confidence || 0) * 100).toFixed(0)}%
                              </Badge>
                              {link.view_count && (
                                <div className="text-xs text-muted-foreground flex items-center justify-end">
                                  <Eye className="h-3 w-3 mr-1" />
                                  {formatNumber(link.view_count)}
                                </div>
                              )}
                              <div className="text-xs text-muted-foreground">
                                {new Date(link.timestamp).toLocaleDateString()}
                              </div>
                            </div>

                            <div className="flex gap-1">
                              <Dialog>
                                <DialogTrigger asChild>
                                  <Button
                                    variant="outline"
                                    size="icon"
                                    className="h-8 w-8"
                                  >
                                    <Info className="h-4 w-4" />
                                  </Button>
                                </DialogTrigger>
                                <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                                  {/* Same dialog content as above */}
                                </DialogContent>
                              </Dialog>

                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => removeLink(link.$id)}
                                className="h-8 w-8 text-destructive hover:text-destructive/90 hover:bg-destructive/10"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          ))}

          {filteredAndSortedLinks.length === 0 && links.length > 0 && (
            <div className="text-center py-12">
              <div className="h-16 w-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
                <Search className="h-6 w-6 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-medium mb-2">No videos found</h3>
              <p className="text-muted-foreground mb-4">
                Try adjusting your search terms or category filter
              </p>
              <Button
                variant="outline"
                onClick={() => {
                  setSearchTerm("");
                  setFilterCategory("all");
                }}
              >
                Clear Filters
              </Button>
            </div>
          )}
        </div>
      </main>

      {/* Bulk Add Dialog */}
      <Dialog open={showBulkAdd} onOpenChange={setShowBulkAdd}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Upload className="h-5 w-5" />
              Bulk Import Videos
            </DialogTitle>
            <DialogDescription>
              Add multiple YouTube links - paste them one per line
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <div className="bg-muted p-3 rounded-md text-sm">
              <h4 className="font-medium mb-2">Supported formats:</h4>
              <div className="text-muted-foreground space-y-1">
                <div>• https://youtu.be/VIDEO_ID</div>
                <div>• https://youtube.com/watch?v=VIDEO_ID</div>
                <div>• https://www.youtube.com/watch?v=VIDEO_ID</div>
              </div>
            </div>

            <Textarea
              value={bulkLinks}
              onChange={(e) => setBulkLinks(e.target.value)}
              placeholder={`https://youtu.be/dQw4w9WgXcQ
https://youtube.com/watch?v=example1
https://youtu.be/example2`}
              className="min-h-[200px] font-mono text-sm"
            />

            {isProcessing && totalToProcess > 0 && (
              <div className="bg-muted p-3 rounded-md">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-medium">Processing Videos</span>
                  <span className="text-sm text-muted-foreground">
                    {processedCount} of {totalToProcess}
                  </span>
                </div>
                <Progress
                  value={(processedCount / totalToProcess) * 100}
                  className="h-2"
                />
                <div className="flex items-center mt-3 text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  <span className="text-sm">
                    AI is analyzing and categorizing your videos...
                  </span>
                </div>
              </div>
            )}

            <DialogFooter className="flex flex-col sm:flex-row justify-end gap-3">
              <Button
                variant="outline"
                onClick={() => {
                  if (!isProcessing) {
                    setShowBulkAdd(false);
                    setBulkLinks("");
                  }
                }}
                disabled={isProcessing}
              >
                {isProcessing ? "Processing..." : "Cancel"}
              </Button>
              <Button
                onClick={handleBulkAdd}
                disabled={isProcessing || !bulkLinks.trim()}
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    Processing
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4 mr-2" />
                    Import Videos
                  </>
                )}
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default App;
