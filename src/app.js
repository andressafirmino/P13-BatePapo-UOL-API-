import express from "express";
import cors from "cors";

const app = express();
app.use(cors());
app.use(express.json());


const users = [];
app.post("/participants", (req, res) => {
    const { name } = req.body;
    
    if (!name || typeof(name) !== "string") {
        return res.sendStatus(422);
    }
    // for(let i = 0; i <= users.length; i++) {
    //     if (users[i].name === name) {
    //         return res.sendStatus(409);
    //     }
    // }
    
    users.push({
        name: name
    });
    res.sendStatus(201);
})
 app.get("/participants", (req, res) => {
    console.log(req.body);
    res.send(users);
 })







const PORT = 5000;
app.listen(PORT, () => console.log(`O servidor está na porta ${PORT}`));