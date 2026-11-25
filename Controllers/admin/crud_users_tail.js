
// Get single user
export const getUser = async (req, res) => {
    try {
        const user = await User.findById(req.params.id);
        if (!user) {
            return res.status(404).json({ success: false, message: "User not found" });
        }
        res.json(user);
    } catch (err) {
        console.error("Get user error:", err);
        res.status(500).json({ success: false, message: "Server error" });
    }
};

// Update user
export const updateUser = async (req, res) => {
    try {
        const { id } = req.params;
        /* Prevent modifying sensitive fields if necessary, 
           but allowing generic updates for admin panel functionality */

        const user = await User.findByIdAndUpdate(id, req.body, { new: true });

        if (!user) {
            return res.status(404).json({ success: false, message: "User not found" });
        }

        res.json({ success: true, message: "User updated successfully", user });
    } catch (err) {
        console.error("Update user error:", err);
        res.status(500).json({ success: false, message: "Server error" });
    }
};

// Delete user
export const deleteUser = async (req, res) => {
    try {
        const { id } = req.params;
        const user = await User.findByIdAndDelete(id);

        if (!user) {
            return res.status(404).json({ success: false, message: "User not found" });
        }

        res.json({ success: true, message: "User deleted successfully" });
    } catch (err) {
        console.error("Delete user error:", err);
        res.status(500).json({ success: false, message: "Server error" });
    }
};
