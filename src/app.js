import express from "express";

const app = express();
const PORT = 5000;
app.listen(PORT, () => console.log(`O servidor está na porta ${PORT}`));