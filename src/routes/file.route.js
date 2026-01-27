const express = require('express');
const path = require('path');
const router = express.Router();

router.get('/avatar/:filename', (req, res) => {
    console.log("req.params",req.params)
  const { filename } = req.params;

  const filePath = path.join(
    __dirname,
    '../uploads/avatar',
    filename
  );

  res.sendFile(filePath, err => {
    if (err) {
      res.status(404).json({ message: 'Image not found' });
    }
  });
});

module.exports = router;
