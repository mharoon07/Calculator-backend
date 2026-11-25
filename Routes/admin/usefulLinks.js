import express from "express";
import {
    getPageContent,
    updatePageContent,
    getServices,
    addService,
    updateService,
    deleteService,
    getBlogs,
    addBlog,
    updateBlog,
    deleteBlog,
    getFaqs,
    addFaq,
    updateFaq,
    deleteFaq,
} from "../../Controllers/admin/usefulLinks.js";

const router = express.Router();

// Page Content (About, Privacy, Terms, Contact)
router.get("/page/:slug", getPageContent);
router.post("/page/:slug", updatePageContent);

// Services
router.get("/services", getServices);
router.post("/services", addService);
router.put("/services/:id", updateService);
router.delete("/services/:id", deleteService);

// Blogs
router.get("/blogs", getBlogs);
router.post("/blogs", addBlog);
router.put("/blogs/:id", updateBlog);
router.delete("/blogs/:id", deleteBlog);

// FAQs
router.get("/faqs", getFaqs);
router.post("/faqs", addFaq);
router.put("/faqs/:id", updateFaq);
router.delete("/faqs/:id", deleteFaq);

export default router;
