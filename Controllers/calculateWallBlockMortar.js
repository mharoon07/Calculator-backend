const calculateWallBlockMortar = async (req, res) => {
  try {
    const { walls } = req.body;

    if (!walls || !Array.isArray(walls) || walls.length === 0) {
      return res.status(400).json({ error: 'At least one wall is required.' });
    }

    const validateDimension = (input) => {
      return !isNaN(input) && parseFloat(input) >= 0;
    };

    const validateRatio = (input) => {
      const regex = /^\d+:\d+$/;
      return regex.test(input);
    };

    const results = walls.map((wall, index) => {
      const requiredFields = [
        'wallHeight',
        'wallLength',
        'blockLength',
        'blockHeight',
        'blockWidth',
        'joint',
        'mortarRatio',
        'waterCementRatio',
      ];

      for (const field of requiredFields) {
        if (!wall[field]) {
          throw new Error(`Missing required field: ${field} for Wall ${index + 1}`);
        }
      }

      // if (
      //   requiredFields.slice(0, 5).some((field) => !validateDimension(wall[field])) ||
      //   (wall.windows && wall.windows.some((win) => !validateDimension(win.width) || !validateDimension(win.height))) ||
      //   (wall.doors && wall.doors.some((door) => !validateDimension(door.width) || !validateDimension(door.height)))
      // ) {
      //   throw new Error(`Invalid dimension format for Wall ${index + 1}. Use positive numbers.`);
      // }

      if (!validateRatio(wall.mortarRatio)) {
        throw new Error(`Invalid mortar ratio format for Wall ${index + 1}. Use format like 1:4.`);
      }

      const wallHeight = parseFloat(wall.wallHeight);
      const wallLength = parseFloat(wall.wallLength);
      const blockL = parseFloat(wall.blockLength);
      const blockH = parseFloat(wall.blockHeight);
      const blockW = parseFloat(wall.blockWidth);
      const joint = parseFloat(wall.joint);
      const [cementPart, sandPart] = wall.mortarRatio.split(':').map(Number);
      const totalParts = cementPart + sandPart;
      const wcRatio = parseFloat(wall.waterCementRatio);

      let windowArea = 0;
      if (wall.windows) {
        windowArea = wall.windows.reduce((sum, win) => sum + (parseFloat(win.width || 0) * parseFloat(win.height || 0)), 0);
      }

      let doorArea = 0;
      if (wall.doors) {
        doorArea = wall.doors.reduce((sum, door) => sum + (parseFloat(door.width || 0) * parseFloat(door.height || 0)), 0);
      }

      const wallArea = wallHeight * wallLength;
      const netWallArea = wallArea - windowArea - doorArea;

      const blockArea = ((blockH + joint) * (blockL + joint)) / 144; // in² to ft²
      console.log(blockArea + "Block Area")


      const blocksNeeded = Math.ceil(netWallArea / blockArea);

      // const envelopeVol = (blockL + joint) * (blockH + joint) * (blockW + joint);
      const envelopeVol = (blockL * blockW) / 144 * (joint / 12) + (blockH * blockW) / 144 * (joint / 12);

      // const blockVol = blockL * blockH * blockW;

      const mortarPerBlock = envelopeVol
      const totalMortar = mortarPerBlock * blocksNeeded;

      const dryMortar = totalMortar * 1.54;
      const cementVol = dryMortar / 1.25 * (cementPart / totalParts);
      const sandVol = dryMortar * (sandPart / totalParts);

      console.log(sandVol)

      const cementM3 = cementVol / 35.3147;
      const cementKg = cementM3 * 1440;
      const waterLiters = cementKg * wcRatio;

      return {
        tag: wall.tag || '',
        grid: wall.grid || '',
        wallLength,
        wallHeight,
        windowArea,
        doorArea,
        netWallArea,
        blocksNeeded,
        totalMortar,
        cementVol,
        sandVol,
        waterLiters,
      };
    });

    res.json({ results });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

export { calculateWallBlockMortar };