import Page from "../../Models/Page.js";
import Service from "../../Models/Service.js";
import Blog from "../../Models/Blog.js";
import FAQ from "../../Models/FAQ.js";

// --- Generic Page Content (About, Privacy, Terms, Contact) ---
export const getPageContent = async (req, res) => {
    const { slug } = req.params;
    try {
        const page = await Page.findOne({ slug });
        if (!page) {
            return res.json({ success: true, data: { title: "", content: "" } });
        }
        res.json({ success: true, data: page });
    } catch (error) {
        console.error(`Error getting page ${slug}:`, error);
        res.status(500).json({ success: false, message: "Server error" });
    }
};

export const updatePageContent = async (req, res) => {
    const { slug } = req.params;
    const { title, content, ...otherData } = req.body;
    try {
        await Page.findOneAndUpdate(
            { slug },
            { title, content, ...otherData },
            { upsert: true, new: true, setDefaultsOnInsert: true }
        );
        res.json({ success: true, message: "Page content updated successfully" });
    } catch (error) {
        console.error(`Error updating page ${slug}:`, error);
        res.status(500).json({ success: false, message: "Server error" });
    }
};

// --- Services ---
export const getServices = async (req, res) => {
    try {
        const services = await Service.find({}).sort({ createdAt: -1 });
        res.json({ success: true, data: services });
    } catch (error) {
        console.error("Error fetching services:", error);
        res.status(500).json({ success: false, message: "Server error" });
    }
};

export const addService = async (req, res) => {
    try {
        const { title, description, icon, image } = req.body;
        const newService = new Service({
            title: title || "",
            description: description || "",
            icon: icon || "",
            image: image || "",
            createdAt: new Date()
        });
        await newService.save();
        res.json({ success: true, message: "Service added", id: newService._id });
    } catch (error) {
        console.error("Error adding service:", error);
        res.status(500).json({ success: false, message: "Server error" });
    }
};

export const updateService = async (req, res) => {
    const { id } = req.params;
    try {
        const data = { ...req.body };
        // Remove undefined fields
        Object.keys(data).forEach(key => data[key] === undefined && delete data[key]);

        await Service.findByIdAndUpdate(id, data);
        res.json({ success: true, message: "Service updated" });
    } catch (error) {
        console.error("Error updating service:", error);
        res.status(500).json({ success: false, message: "Server error" });
    }
};

export const deleteService = async (req, res) => {
    const { id } = req.params;
    try {
        await Service.findByIdAndDelete(id);
        res.json({ success: true, message: "Service deleted" });
    } catch (error) {
        console.error("Error deleting service:", error);
        res.status(500).json({ success: false, message: "Server error" });
    }
};

// --- Blogs ---
export const getBlogs = async (req, res) => {
    try {
        const blogs = await Blog.find({}).sort({ createdAt: -1 });
        res.json({ success: true, data: blogs });
    } catch (error) {
        console.error("Error fetching blogs:", error);
        res.status(500).json({ success: false, message: "Server error" });
    }
};

export const addBlog = async (req, res) => {
    try {
        const { title, content, author, image, tags } = req.body;
        const newBlog = new Blog({
            title: title || "",
            content: content || "",
            author: author || "",
            image: image || "",
            tags: tags || [],
            createdAt: new Date()
        });
        await newBlog.save();
        res.json({ success: true, message: "Blog added", id: newBlog._id });
    } catch (error) {
        console.error("Error adding blog:", error);
        res.status(500).json({ success: false, message: "Server error" });
    }
};

export const updateBlog = async (req, res) => {
    const { id } = req.params;
    try {
        const data = { ...req.body };
        Object.keys(data).forEach(key => data[key] === undefined && delete data[key]);

        await Blog.findByIdAndUpdate(id, data);
        res.json({ success: true, message: "Blog updated" });
    } catch (error) {
        console.error("Error updating blog:", error);
        res.status(500).json({ success: false, message: "Server error" });
    }
};

export const deleteBlog = async (req, res) => {
    const { id } = req.params;
    try {
        await Blog.findByIdAndDelete(id);
        res.json({ success: true, message: "Blog deleted" });
    } catch (error) {
        console.error("Error deleting blog:", error);
        res.status(500).json({ success: false, message: "Server error" });
    }
};

// --- FAQ ---
export const getFaqs = async (req, res) => {
    try {
        const faqs = await FAQ.find({}).sort({ createdAt: 1 });
        res.json({ success: true, data: faqs });
    } catch (error) {
        console.error("Error fetching FAQs:", error);
        res.status(500).json({ success: false, message: "Server error" });
    }
};

export const addFaq = async (req, res) => {
    try {
        const { question, answer } = req.body;
        const newFaq = new FAQ({
            question: question || "",
            answer: answer || "",
            createdAt: new Date()
        });
        await newFaq.save();
        res.json({ success: true, message: "FAQ added", id: newFaq._id });
    } catch (error) {
        console.error("Error adding FAQ:", error);
        res.status(500).json({ success: false, message: "Server error" });
    }
};

export const updateFaq = async (req, res) => {
    const { id } = req.params;
    try {
        const data = { ...req.body };
        Object.keys(data).forEach(key => data[key] === undefined && delete data[key]);

        await FAQ.findByIdAndUpdate(id, data);
        res.json({ success: true, message: "FAQ updated" });
    } catch (error) {
        console.error("Error updating FAQ:", error);
        res.status(500).json({ success: false, message: "Server error" });
    }
};

export const deleteFaq = async (req, res) => {
    const { id } = req.params;
    try {
        await FAQ.findByIdAndDelete(id);
        res.json({ success: true, message: "FAQ deleted" });
    } catch (error) {
        console.error("Error deleting FAQ:", error);
        res.status(500).json({ success: false, message: "Server error" });
    }
};
