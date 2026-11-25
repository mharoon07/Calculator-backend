import Subtype from "../../Models/Subtype.js";

// Hardcoded dataModel for initialization (as provided)
const originalDataModel = [
  {
    group: "Civil Finishes",
    items: [
      { name: "Tile Work", rate_normal: 1074, rate_superior: 1932, type: "sqft", months: [0, 5, 95, 0, 0, 0, 0, 0], note_normal: "Tile upto max range of 3000", note_superior: "Tile upto max range of 3000" },
      { name: "Paint (Internal & External)", rate_normal: 274, rate_superior: 391, type: "sqft", months: [0, 10, 20, 0, 0, 60, 0, 10], note_normal: "Regular paint", note_superior: "Berger Paint" },
      { name: "Aluminum Window (with glass)", rate_normal: 299, rate_superior: 367, type: "sqft", months: [0, 0, 20, 55, 25, 0, 0, 0], note_normal: "1.2 mm Aluminum with 5mm tempered glass", note_superior: "1.6 mm Aluminum with 5mm tempered glass" },
      { name: "Granite & Marble", rate_normal: 254, rate_superior: 355, type: "sqft", months: [0, 0, 5, 75, 20, 0, 0, 0], note_normal: "Granite upto 900/sq.ft; roof marble upto 80/sq.ft", note_superior: "Granite upto 900/sq.ft; roof marble upto 80/sq.ft" },
      { name: "False Ceiling", rate_normal: 68, rate_superior: 169, type: "sqft", months: [50, 50, 0, 0, 0, 0, 0, 0], note_normal: "Standard False Ceiling in Lounge only", note_superior: "Standard False Ceiling" },
      { name: "Terrace Railing ", rate_normal: 47, rate_superior: 70, type: "sqft", months: [0, 45, 55, 0, 0, 0, 0, 0], note_normal: "As needed", note_superior: "As needed with SS" }
    ]
  },
  {
    group: "Woodwork & Metal",
    items: [
      { name: "Doors", rate_normal: 350, rate_superior: 756, type: "sqft", months: [0, 0, 35, 35, 30, 0, 0, 0], note_normal: "Main doors solid; all other pressed ply", note_superior: "Solid doors with Red Maranti wood" },
      { name: "Wardrobe", rate_normal: 252, rate_superior: 252, type: "sqft", months: [0, 0, 15, 50, 35, 0, 0, 0], note_normal: "Shutter Linga High Gloss, Caracas ZRK MDF", note_superior: "Shutter Linga High Gloss, Caracas ZRK MDF" },
      { name: "Door Polish", rate_normal: 101, rate_superior: 203, type: "sqft", months: [0, 0, 0, 0, 0, 15, 70, 15], note_normal: "As needed", note_superior: "As needed" },
      { name: "MS (Door & Duct) Work", rate_normal: 145, rate_superior: 145, type: "sqft", months: [35, 65, 0, 0, 0, 0, 0, 0], note_normal: "MS 16 gauge material", note_superior: "MS 16 gauge material" },
      { name: "Stair Hand Rail", rate_normal: 127, rate_superior: 127, type: "sqft", months: [0, 0, 0, 0, 25, 75, 0, 0], note_normal: "As needed", note_superior: "As needed" },
      { name: "Door Handles / Lock", rate_normal: 139, rate_superior: 139, type: "sqft", months: [0, 0, 0, 0, 0, 0, 15, 85], note_normal: "Door handles up to 8000, standard", note_superior: "Door handles up to 8000, standard" }
    ]
  },
  {
    group: "Kitchen & Bathrooms",
    items: [
      { name: "Kitchen", rate_normal: 209, rate_superior: 277, type: "sqft", months: [0, 0, 0, 15, 50, 35, 0, 0], note_normal: "Shutter High Gloss, Caracas MDF", note_superior: "Shutter High Gloss, Caracas MDF" },
      { name: "Shower Cubical", rate_normal: 123, rate_superior: 123, type: "sqft", months: [0, 0, 0, 0, 0, 65, 35, 0], note_normal: "8mm Glass", note_superior: "8mm Glass" },
      { name: "Bath Room & Vanity (w/ Fittings)", rate_normal: 276, rate_superior: 276, type: "sqft", months: [0, 0, 0, 50, 50, 0, 0, 0], note_normal: "Commode @ 32000, Wash Basin @ 12000", note_superior: "Commode @ 32000, Wash Basin @ 12000" }
    ]
  },
  {
    group: "Electrical & Mechanical",
    items: [
      { name: "Electric Work", rate_normal: 479, rate_superior: 783, type: "sqft", months: [20, 50, 0, 0, 0, 20, 10, 0], note_normal: "AGE Cable; LED Lights 550/pcs", note_superior: "Pakistan Cable; LED Lights 550/pcs" },
      { name: "Plumbing Work", rate_normal: 115, rate_superior: 157, type: "sqft", months: [20, 50, 0, 0, 0, 20, 10, 0], note_normal: "PPR and uPVC Pipes", note_superior: "PPR and uPVC Pipes" },
      { name: "AC Work", rate_normal: 145, rate_superior: 145, type: "sqft", months: [35, 65, 0, 0, 0, 0, 0, 0], note_normal: "Muhller Tubes", note_superior: "Muhller Tubes" },
      { name: "Earthing", rate_normal: 52, rate_superior: 52, type: "sqft", months: [0, 100, 0, 0, 0, 0, 0, 0], note_normal: "99.99% Copper Wire Earthing", note_superior: "99.99% Copper Wire Earthing" }
    ]
  },
  {
    group: "Security System",
    items: [
      { name: "Electric Fencing Work", rate_normal: 0, rate_superior: 56, type: "lump", months: [0, 0, 0, 0, 0, 100, 0, 0], note_normal: "N/A", note_superior: "" },
      { name: "Camera Work (HikVision)", rate_normal: 0, rate_superior: 61, type: "lump", months: [0, 0, 0, 0, 0, 0, 100, 0], note_normal: "0 HikVision", note_superior: "HikVision" },
      { name: "Intruder Alarm System", rate_normal: 0, rate_superior: 22, type: "lump", months: [0, 0, 0, 0, 0, 0, 100, 0], note_normal: "Chinese Brand", note_superior: "Chinese Brand" }
    ]
  },
  {
    group: "Completion",
    items: [
      { name: "Site Cleaning / Labour", rate_normal: 44, rate_superior: 59, type: "sqft", months: [0, 0, 0, 0, 0, 0, 0, 100], note_normal: "", note_superior: "Chinese Brand" },
      { name: "External Garden Work", rate_normal: 18, rate_superior: 17, type: "sqft", months: [0, 0, 0, 0, 0, 0, 100, 0], note_normal: "Chinese Brand", note_superior: "Chinese Brand" }
    ]
  }
];

// Controller to fetch finishing rates and notes
export const getFinishingRates = async (req, res) => {
  const { subtypeId } = req.params;

  try {
    // Validate subtypeId
    if (!subtypeId) {
      return res.status(400).json({ success: false, message: "Missing subtypeId" });
    }

    // Fetch subtype document
    const subtype = await Subtype.findById(subtypeId);

    if (!subtype) {
      return res.status(404).json({ success: false, message: "Subtype not found" });
    }

    // Initialize dataModel if not initialized
    if (!subtype.finishing || !subtype.ratesAndNotes || subtype.ratesAndNotes.length === 0) {
      console.log(`Initializing finishing dataModel for subtypeId: ${subtypeId}`);
      subtype.finishing = {
        title: "Finishing Cost Estimation",
        icon: "",
        createdAt: new Date(),
        dataModel: originalDataModel,
      };
      // For legacy consistency, let's say ratesAndNotes is what we want
      // But the original code was mapping dataModel to ratesAndNotes
      await subtype.save();
      console.log("Finishing dataModel initialized successfully.");
    }

    const dataModel = subtype.finishing?.dataModel || originalDataModel;

    // Extract only rates and notes
    const ratesAndNotes = dataModel.map(group => ({
      group: group.group,
      items: group.items.map(item => ({
        name: item.name,
        rate_normal: item.rate_normal,
        rate_superior: item.rate_superior,
        note_normal: item.note_normal,
        note_superior: item.note_superior,
      })),
    }));

    res.json({
      success: true,
      description: subtype.description || "Finishing rates and notes",
      title: subtype.finishing?.title || "Finishing Cost Estimation",
      ratesAndNotes,
    });
  } catch (err) {
    console.error("❌ Error fetching finishing rates:", err);
    res.status(500).json({ success: false, message: "Failed to fetch finishing rates" });
  }
};

export const updateFinishingItem = async (req, res) => {
  const { subtypeId } = req.params;
  const { title, description, groupName, itemName, rate_normal, rate_superior, note_normal, note_superior } = req.body;

  try {
    const subtype = await Subtype.findById(subtypeId);

    if (!subtype) {
      return res.status(404).json({ success: false, message: "Subtype not found" });
    }

    if (!subtype.finishing) {
      subtype.finishing = { dataModel: originalDataModel };
    }

    // ✅ Handle title & description updates
    if (title !== undefined) subtype.finishing.title = title;
    if (description !== undefined) subtype.description = description;

    // ✅ Handle item updates if groupName + itemName provided
    if (groupName && itemName) {
      let dataModel = subtype.finishing?.dataModel;

      if (!dataModel || !dataModel.length) {
        dataModel = originalDataModel;
      }


      let updated = false;
      const updatedDataModel = dataModel.map(group => {
        if (group.group === groupName) {
          const updatedItems = group.items.map(item => {
            if (item.name === itemName) {
              updated = true;
              return {
                ...item,
                rate_normal: rate_normal ?? item.rate_normal,
                rate_superior: rate_superior ?? item.rate_superior,
                note_normal: note_normal ?? item.note_normal,
                note_superior: note_superior ?? item.note_superior,
              };
            }
            return item;
          });
          return { ...group, items: updatedItems };
        }
        return group;
      });

      if (!updated) {
        return res.status(404).json({ success: false, message: "Item not found in dataModel" });
      }

      subtype.finishing.dataModel = updatedDataModel;
    }

    subtype.markModified('finishing');
    await subtype.save();

    res.json({ success: true, message: "Finishing data updated successfully" });
  } catch (err) {
    console.error("❌ Error updating finishing item:", err);
    res.status(500).json({ success: false, message: "Failed to update finishing item" });
  }
};
