import React, { useState, useEffect, useMemo } from "react";
import { createClient } from "@supabase/supabase-js";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
} from "@/components/ui/dialog";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  Plus,
  Trash2,
  FolderOpen,
  Loader2,
  Download,
  Upload,
  Search,
  BarChart,
  Grid,
  List,
  Info,
  Menu,
  X,
} from "lucide-react";

// Environment variables and Supabase setup remain the same
const YOUTUBE_API_KEY = import.meta.env.VITE_YOUTUBE_API_KEY;
const GROQ_API_KEY = import.meta.env.VITE_GROQ_API_KEY;
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const App = () => {
  // State management remains the same
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

  // All existing functions remain the same
  useEffect(() => {
    fetchLinks();
  }, []);

  useEffect(() => {
    calculateStats();
  }, [links]);

  const fetchLinks = async () => {
    try {
      const { data, error } = await supabase
        .from("youtube_links")
        .select("*")
        .order("timestamp", { ascending: false });

      if (error) throw error;
      setLinks(data || []);
    } catch (error) {
      console.error("Error fetching links:", error);
      setError("Failed to load links");
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
    };

    links.forEach((link) => {
      // Count categories
      stats.categoriesCount[link.main_category] =
        (stats.categoriesCount[link.main_category] || 0) + 1;

      // Count tags remains the same
      link.tags.forEach((tag) => {
        stats.tagsCount[tag] = (stats.tagsCount[tag] || 0) + 1;
      });

      // Monthly additions
      const month = new Date(link.timestamp).toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
      });
      stats.monthlyAdditions[month] = (stats.monthlyAdditions[month] || 0) + 1;

      // Average confidence
      stats.averageConfidence += link.confidence;
    });

    stats.averageConfidence = (
      (stats.averageConfidence / links.length) *
      100
    ).toFixed(1);

    setStats(stats);
  };

  const extractVideoId = (url) => {
    const regExp =
      /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
    const match = url.match(regExp);
    return match && match[2].length === 11 ? match[2] : null;
  };

  const fetchVideoDetails = async (videoId) => {
    const response = await fetch(
      `https://www.googleapis.com/youtube/v3/videos?id=${videoId}&key=${YOUTUBE_API_KEY}&part=snippet`
    );
    const data = await response.json();
    if (!data.items?.[0]?.snippet) {
      throw new Error("Video not found or API error");
    }
    return data.items[0].snippet;
  };

  const analyzeWithGroq = async (videoDetails) => {
    const prompt = `
      Analyze this YouTube video content and categorize it:
      
      Title: ${videoDetails.title}
      Description: ${videoDetails.description}
      
      Provide a JSON response with the following structure:
      {
        "mainCategory": "single most relevant category",
        "subCategories": ["up to 3 related categories"],
        "tags": ["up to 5 relevant keywords"],
        "confidence": 0.95
      }
    `;

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
                "You are an AI assistant that analyzes YouTube videos and provides accurate categorization with relevant tags. Always respond with valid JSON.",
            },
            {
              role: "user",
              content: prompt,
            },
          ],
          model: "llama3-8b-8192",
          temperature: 0.3,
          response_format: { type: "json_object" },
        }),
      }
    );

    if (!response.ok) {
      throw new Error("Failed to analyze video with AI");
    }

    const data = await response.json();
    return JSON.parse(data.choices[0].message.content);
  };

  const processVideoLink = async (url) => {
    const videoId = extractVideoId(url);
    if (!videoId) {
      throw new Error("Invalid YouTube URL");
    }

    const videoDetails = await fetchVideoDetails(videoId);
    const aiAnalysis = await analyzeWithGroq(videoDetails);

    const linkData = {
      url,
      video_id: videoId, // Changed from videoId
      timestamp: new Date().toISOString(),
      title: videoDetails.title,
      thumbnail: videoDetails.thumbnails.medium.url,
      description: videoDetails.description,
      main_category: aiAnalysis.mainCategory, // Changed from mainCategory
      sub_categories: aiAnalysis.subCategories, // Changed from subCategories
      tags: aiAnalysis.tags,
      confidence: aiAnalysis.confidence,
    };

    const { data, error } = await supabase
      .from("youtube_links")
      .insert([linkData])
      .select();

    if (error) throw error;
    return data[0];
  };

  const handleAddLink = async () => {
    setError(null);
    if (!newLink) return;

    setIsProcessing(true);
    try {
      const newLinkObj = await processVideoLink(newLink);
      setLinks((prev) => [newLinkObj, ...prev]);
      setNewLink("");
    } catch (error) {
      console.error("Error:", error);
      setError("Failed to process video. Please try again.");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleBulkAdd = async () => {
    setError(null);
    if (!bulkLinks) return;

    setIsProcessing(true);
    const urls = bulkLinks
      .split(/[\n\s]+/)
      .map((url) => url.trim())
      .filter((url) => url.length > 0);

    setTotalToProcess(urls.length);
    setProcessedCount(0);

    try {
      const newLinks = [];
      for (const url of urls) {
        try {
          const newLink = await processVideoLink(url);
          newLinks.push(newLink);
          setProcessedCount((prev) => prev + 1);
        } catch (error) {
          console.error(`Error processing ${url}:`, error);
        }
      }

      setLinks((prev) => [...newLinks, ...prev]);
      setBulkLinks("");
      setShowBulkAdd(false);
    } catch (error) {
      console.error("Error:", error);
      setError(
        "Failed to process some videos. Please check the console for details."
      );
    } finally {
      setIsProcessing(false);
      setTotalToProcess(0);
      setProcessedCount(0);
    }
  };

  const handleExport = () => {
    const blob = new Blob([JSON.stringify(links, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "youtube_links_export.json";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const removeLink = async (id) => {
    try {
      const { error } = await supabase
        .from("youtube_links")
        .delete()
        .eq("id", id);

      if (error) throw error;
      setLinks((prev) => prev.filter((link) => link.id !== id));
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
          link.title.toLowerCase().includes(term) ||
          link.tags.some((tag) => tag.toLowerCase().includes(term))
      );
    }

    // In the filteredAndSortedLinks useMemo
    if (filterCategory !== "all") {
      result = result.filter((link) => link.main_category === filterCategory);
    }

    // Sort
    switch (sortBy) {
      case "date":
        result.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
        break;
      case "title":
        result.sort((a, b) => a.title.localeCompare(b.title));
        break;
      case "confidence":
        result.sort((a, b) => b.confidence - a.confidence);
        break;
    }

    return result;
  }, [links, searchTerm, filterCategory, sortBy]);

  // Group links by category
  const categorizedLinks = useMemo(() => {
    return filteredAndSortedLinks.reduce((acc, link) => {
      // In the categorizedLinks useMemo
      const category = link.main_category || "Uncategorized";
      if (!acc[category]) {
        acc[category] = [];
      }
      acc[category].push(link);
      return acc;
    }, {});
  }, [filteredAndSortedLinks]);

  const allCategories = useMemo(() => {
    return ["all", ...new Set(links.map((link) => link.main_category))];
  }, [links]);

  return (
    <div className="bg-gray-50 min-h-screen">
      {/* Mobile Header */}
      <div className="lg:hidden fixed top-0 left-0 right-0 bg-white border-b border-gray-200 z-50">
        <div className="flex items-center justify-between p-4">
          <h1 className="text-lg font-bold">YT Manager</h1>
          <div className="flex items-center gap-2">
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
            <SheetTitle>Categories</SheetTitle>
          </SheetHeader>
          <div className="py-4">
            {allCategories.map((category) => (
              <button
                key={category}
                onClick={() => {
                  setFilterCategory(category);
                  setIsMobileMenuOpen(false);
                }}
                className={`w-full text-left px-6 py-3 transition-colors ${
                  filterCategory === category
                    ? "bg-blue-50 text-blue-700"
                    : "text-gray-700"
                }`}
              >
                <div className="flex items-center">
                  <FolderOpen className="h-4 w-4 mr-3" />
                  <span className="font-medium capitalize">{category}</span>
                </div>
              </button>
            ))}
          </div>
        </SheetContent>
      </Sheet>

      {/* Desktop Sidebar */}
      <aside className="hidden lg:block w-64 bg-white h-screen fixed left-0 top-0 border-r border-gray-200">
        <div className="p-6">
          <h1 className="text-xl font-bold text-gray-800">YT Manager</h1>
          <p className="text-sm text-gray-500 mt-1">AI-Powered Organization</p>
        </div>

        <nav className="px-4 mt-4">
          {allCategories.map((category) => (
            <button
              key={category}
              onClick={() => setFilterCategory(category)}
              className={`w-full text-left px-4 py-3 rounded-lg mb-1 transition-colors ${
                filterCategory === category
                  ? "bg-blue-50 text-blue-700"
                  : "hover:bg-gray-100 text-gray-700"
              }`}
            >
              <div className="flex items-center">
                <FolderOpen className="h-4 w-4 mr-3" />
                <span className="font-medium capitalize">{category}</span>
              </div>
            </button>
          ))}
        </nav>
      </aside>

      {/* Main Content */}
      <main className="lg:ml-64 pt-[72px] lg:pt-0">
        <div className="p-4 lg:p-8">
          {/* Search and Actions Bar */}
          <div className="flex flex-col lg:flex-row gap-4 lg:items-center lg:justify-between mb-6">
            <div className="flex-1 max-w-xl">
              <div className="relative">
                <Search className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
                <Input
                  type="text"
                  placeholder="Search videos..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 h-12 w-full"
                />
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                onClick={() =>
                  setViewMode(viewMode === "grid" ? "list" : "grid")
                }
                className="h-12"
              >
                {viewMode === "grid" ? (
                  <List className="h-5 w-5" />
                ) : (
                  <Grid className="h-5 w-5" />
                )}
              </Button>
              <Button
                variant="outline"
                onClick={() => setShowStats(!showStats)}
                className="h-12"
              >
                <BarChart className="h-5 w-5" />
              </Button>
              <Button
                onClick={() => setShowBulkAdd(true)}
                className="h-12 bg-blue-600 hover:bg-blue-700"
              >
                <Plus className="h-5 w-5 mr-2" />
                <span className="hidden sm:inline">Add Videos</span>
              </Button>
            </div>
          </div>

          {/* Quick Add Section */}
          <Card className="mb-6">
            <CardContent className="p-4">
              <div className="flex flex-col sm:flex-row gap-3">
                <Input
                  type="text"
                  value={newLink}
                  onChange={(e) => setNewLink(e.target.value)}
                  placeholder="Paste YouTube link..."
                  className="flex-1 h-12"
                  onKeyPress={(e) =>
                    e.key === "Enter" && !isProcessing && handleAddLink()
                  }
                />
                <Button
                  onClick={handleAddLink}
                  disabled={isProcessing}
                  className="h-12 sm:w-auto w-full"
                >
                  {isProcessing ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  ) : (
                    "Add"
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Statistics Overview */}
          {showStats && stats && (
            <div className="mb-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-500">
                        Total Videos
                      </p>
                      <h3 className="text-2xl font-bold mt-1">
                        {stats.totalVideos}
                      </h3>
                    </div>
                    <div className="h-12 w-12 bg-blue-100 rounded-full flex items-center justify-center">
                      <BarChart className="h-6 w-6 text-blue-600" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Other stat cards... */}
            </div>
          )}

          {/* Video Content */}
          {Object.entries(categorizedLinks).map(([category, categoryLinks]) => (
            <div key={category} className="mb-8">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
                <h2 className="text-xl font-semibold text-gray-800 flex items-center gap-2">
                  <FolderOpen className="h-5 w-5 text-gray-500" />
                  {category}
                  <Badge className="ml-2">{categoryLinks.length}</Badge>
                </h2>
                <Select value={sortBy} onValueChange={setSortBy}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Sort by" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="date">Latest First</SelectItem>
                    <SelectItem value="title">Title A-Z</SelectItem>
                    <SelectItem value="confidence">Confidence</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {viewMode === "grid" ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {categoryLinks.map((link) => (
                    <Card
                      key={link.id}
                      className="overflow-hidden hover:shadow-lg transition-shadow"
                    >
                      <div className="relative pb-[56.25%]">
                        <img
                          src={link.thumbnail}
                          alt={link.title}
                          className="absolute inset-0 w-full h-full object-cover"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                        <div className="absolute bottom-0 left-0 right-0 p-4">
                          <Badge className="bg-blue-500 text-white">
                            {(link.confidence * 100).toFixed(1)}% confidence
                          </Badge>
                        </div>
                      </div>

                      <CardContent className="p-4">
                        <a
                          href={link.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-base sm:text-lg font-medium text-gray-800 hover:text-blue-600 line-clamp-2 mb-2"
                        >
                          {link.title}
                        </a>

                        <div className="flex flex-wrap gap-1 mb-3">
                          {link.tags.slice(0, 3).map((tag, idx) => (
                            <Badge
                              key={idx}
                              variant="outline"
                              className="text-xs"
                            >
                              #{tag}
                            </Badge>
                          ))}
                          {link.tags.length > 3 && (
                            <Badge variant="outline" className="text-xs">
                              +{link.tags.length - 3}
                            </Badge>
                          )}
                        </div>

                        <div className="flex items-center justify-between text-sm text-gray-500">
                          <span>
                            {new Date(link.timestamp).toLocaleDateString()}
                          </span>
                          <Dialog>
                            <DialogTrigger asChild>
                              <Button variant="ghost" size="sm">
                                Details
                              </Button>
                            </DialogTrigger>
                            <DialogContent className="w-[90vw] max-w-2xl">
                              <DialogHeader>
                                <DialogTitle className="pr-8">
                                  {link.title}
                                </DialogTitle>
                              </DialogHeader>
                              <div className="space-y-4 mt-4">
                                <div>
                                  <h4 className="font-medium mb-2">
                                    Description
                                  </h4>
                                  <p className="text-sm text-gray-600">
                                    {link.description}
                                  </p>
                                </div>
                                <div>
                                  <h4 className="font-medium mb-2">
                                    Categories
                                  </h4>
                                  <div className="flex flex-wrap gap-2">
                                    <Badge>{link.main_category}</Badge>
                                    {link.sub_categories.map((subCat, idx) => (
                                      <Badge key={idx} variant="outline">
                                        {subCat}
                                      </Badge>
                                    ))}
                                  </div>
                                </div>
                                <div>
                                  <h4 className="font-medium mb-2">Tags</h4>
                                  <div className="flex flex-wrap gap-2">
                                    {link.tags.map((tag, idx) => (
                                      <Badge key={idx} variant="outline">
                                        #{tag}
                                      </Badge>
                                    ))}
                                  </div>
                                </div>
                                <div className="flex justify-end">
                                  <Button
                                    variant="destructive"
                                    onClick={() => removeLink(link.id)}
                                    className="mt-4"
                                  >
                                    <Trash2 className="h-4 w-4 mr-2" />
                                    Delete
                                  </Button>
                                </div>
                              </div>
                            </DialogContent>
                          </Dialog>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <div className="space-y-4">
                  {categoryLinks.map((link) => (
                    <Card
                      key={link.id}
                      className="hover:shadow-md transition-shadow"
                    >
                      <CardContent className="p-4">
                        <div className="flex flex-col sm:flex-row gap-4">
                          <div className="w-full sm:w-48 h-28 relative">
                            <img
                              src={link.thumbnail}
                              alt={link.title}
                              className="absolute inset-0 w-full h-full object-cover rounded-lg"
                            />
                          </div>
                          <div className="flex-1 min-w-0">
                            <a
                              href={link.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-base sm:text-lg font-medium text-gray-800 hover:text-blue-600 line-clamp-1 mb-2"
                            >
                              {link.title}
                            </a>
                            <p className="text-sm text-gray-500 line-clamp-2 mb-2">
                              {link.description}
                            </p>
                            <div className="flex flex-wrap gap-2">
                              {link.tags.map((tag, idx) => (
                                <Badge
                                  key={idx}
                                  variant="outline"
                                  className="text-xs"
                                >
                                  #{tag}
                                </Badge>
                              ))}
                            </div>
                          </div>
                          <div className="flex sm:flex-col items-start sm:items-end justify-between gap-2">
                            <Badge className="bg-blue-50 text-blue-700">
                              {(link.confidence * 100).toFixed(1)}%
                            </Badge>
                            <span className="text-sm text-gray-500">
                              {new Date(link.timestamp).toLocaleDateString()}
                            </span>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </main>

      {/* Bulk Add Dialog */}
      <Dialog open={showBulkAdd} onOpenChange={setShowBulkAdd}>
        <DialogContent className="w-[90vw] max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-xl font-semibold">
              Bulk Import Videos
            </DialogTitle>
            <DialogDescription>
              Add multiple YouTube links - one per line or space-separated
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-6 mt-4">
            <Textarea
              value={bulkLinks}
              onChange={(e) => setBulkLinks(e.target.value)}
              placeholder="https://youtu.be/... https://youtu.be/..."
              className="min-h-[200px] p-4"
            />
            {isProcessing && totalToProcess > 0 && (
              <div className="bg-blue-50 text-blue-700 p-4 rounded-lg flex items-center">
                <Loader2 className="h-5 w-5 animate-spin mr-3" />
                <span>
                  Processing {processedCount} of {totalToProcess} videos...
                </span>
              </div>
            )}
            <div className="flex flex-col sm:flex-row justify-end gap-3">
              <Button
                variant="outline"
                onClick={() => setShowBulkAdd(false)}
                className="w-full sm:w-auto order-1 sm:order-none"
              >
                Cancel
              </Button>
              <Button
                onClick={handleBulkAdd}
                disabled={isProcessing}
                className="w-full sm:w-auto min-w-[120px]"
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    Processing
                  </>
                ) : (
                  "Import Videos"
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default App;
