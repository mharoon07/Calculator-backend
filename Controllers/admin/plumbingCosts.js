import PlumbingCost from "../../Models/PlumbingCost.js";

// Get all plumbing cost items
export const getPlumbingCosts = async (req, res) => {
  try {
    console.log('Fetching all plumbing costs...');
    const costs = await PlumbingCost.find({});

    res.json({
      success: true,
      data: costs
    });
  } catch (error) {
    console.error('Error fetching plumbing costs:', error);
    res.status(500).json({
      success: false,
      error: `Failed to fetch plumbing costs: ${error.message}`
    });
  }
};

// Get plumbing cost by ID
export const getPlumbingCostById = async (req, res) => {
  try {
    const { id } = req.params;
    const cost = await PlumbingCost.findById(id);

    if (!cost) {
      return res.status(404).json({
        success: false,
        error: 'Plumbing cost item not found'
      });
    }

    res.json({
      success: true,
      data: cost
    });
  } catch (error) {
    console.error('Error fetching plumbing cost:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch plumbing cost'
    });
  }
};

// Create new plumbing cost item
export const createPlumbingCost = async (req, res) => {
  try {
    const {
      item,
      material,
      size,
      unit,
      price,
      category,
      description,
      isActive = true
    } = req.body;

    // Validate required fields
    if (!item || !material || !size || !price) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: item, material, size, price'
      });
    }

    const newCost = new PlumbingCost({
      item,
      material,
      size,
      unit: unit || 'piece',
      price: parseFloat(price),
      category: category || 'general',
      description: description || '',
      isActive,
      createdAt: new Date(),
      updatedAt: new Date()
    });

    await newCost.save();

    res.status(201).json({
      success: true,
      data: newCost,
      message: 'Plumbing cost item created successfully'
    });
  } catch (error) {
    console.error('Error creating plumbing cost:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create plumbing cost item'
    });
  }
};

// Update plumbing cost item
export const updatePlumbingCost = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      item,
      material,
      size,
      unit,
      price,
      category,
      description,
      isActive
    } = req.body;

    const updateData = {
      updatedAt: new Date()
    };

    // Only update provided fields
    if (item !== undefined) updateData.item = item;
    if (material !== undefined) updateData.material = material;
    if (size !== undefined) updateData.size = size;
    if (unit !== undefined) updateData.unit = unit;
    if (price !== undefined) updateData.price = parseFloat(price);
    if (category !== undefined) updateData.category = category;
    if (description !== undefined) updateData.description = description;
    if (isActive !== undefined) updateData.isActive = isActive;

    const updatedCost = await PlumbingCost.findByIdAndUpdate(id, updateData, { new: true });

    if (!updatedCost) {
      return res.status(404).json({
        success: false,
        error: 'Plumbing cost item not found'
      });
    }

    res.json({
      success: true,
      data: updatedCost,
      message: 'Plumbing cost item updated successfully'
    });
  } catch (error) {
    console.error('Error updating plumbing cost:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update plumbing cost item'
    });
  }
};

// Delete plumbing cost item
export const deletePlumbingCost = async (req, res) => {
  try {
    const { id } = req.params;

    const deleted = await PlumbingCost.findByIdAndDelete(id);

    if (!deleted) {
      return res.status(404).json({
        success: false,
        error: 'Plumbing cost item not found'
      });
    }

    res.json({
      success: true,
      message: 'Plumbing cost item deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting plumbing cost:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete plumbing cost item'
    });
  }
};

// Bulk create plumbing cost items (for initial setup)
export const bulkCreatePlumbingCosts = async (req, res) => {
  try {
    const { items } = req.body;

    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Items array is required and must not be empty'
      });
    }

    const createdItems = await PlumbingCost.insertMany(items.map(item => ({
      ...item,
      price: parseFloat(item.price),
      createdAt: new Date(),
      updatedAt: new Date()
    })));

    res.status(201).json({
      success: true,
      data: createdItems,
      message: `${createdItems.length} plumbing cost items created successfully`
    });
  } catch (error) {
    console.error('Error bulk creating plumbing costs:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to bulk create plumbing cost items'
    });
  }
};

// Bulk update plumbing cost items
export const bulkUpdatePlumbingCosts = async (req, res) => {
  try {
    console.log('Bulk updating plumbing costs...');
    const { materials } = req.body;

    if (!Array.isArray(materials) || materials.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Materials array is required and must not be empty'
      });
    }

    const updatePromises = materials.map(material => {
      const { id, price, ...otherFields } = material;
      const updateData = { ...otherFields, updatedAt: new Date() };
      if (price !== undefined) updateData.price = parseFloat(price);
      return PlumbingCost.findByIdAndUpdate(id, updateData, { new: true });
    });

    const updatedItems = await Promise.all(updatePromises);

    res.json({
      success: true,
      data: updatedItems,
      message: `${updatedItems.length} plumbing cost items updated successfully`
    });
  } catch (error) {
    console.error('Error bulk updating plumbing costs:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to bulk update plumbing cost items'
    });
  }
};

// Test endpoint to verify API is working
export const testBulkUpdate = async (req, res) => {
  try {
    res.json({
      success: true,
      message: 'Test endpoint working',
      receivedData: req.body
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// Get plumbing costs by category
export const getPlumbingCostsByCategory = async (req, res) => {
  try {
    const { category } = req.params;

    const costs = await PlumbingCost.find({
      category: category,
      isActive: true
    });

    res.json({
      success: true,
      data: costs
    });
  } catch (error) {
    console.error('Error fetching plumbing costs by category:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch plumbing costs by category'
    });
  }
};
