import React from "react";
import { Box, Typography } from "@mui/material";

const Label = ({ roomId }) => {
  return (
    <Box
      sx={{
        position: "absolute",
        bottom: { xs: 83, sm: 20 },
        right: { xs: 70, sm: 20 },
        backgroundColor: "white",
        border: "2px solid black",
        borderRadius: "8px",
        padding: "10px 20px",
        textAlign: "center",
      }}
    >
      <Typography variant="h6" sx={{ fontWeight: "bold" }}>
        Your Meeting Room
      </Typography>
      <Typography variant="subtitle1">Room ID: {roomId || "Generating..."}</Typography>
    </Box>
  );
};

export default Label;
