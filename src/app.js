import express from "express";
import cors from "cors";
import { MongoClient } from "mongodb";
import joi from "joi";
import dayjs from 'dayjs';
import dotenv from "dotenv";

const app = express();
app.use(cors());
app.use(express.json());
dotenv.config();

const mongoClient = new MongoClient(process.env.DATABASE_URL);
let db;

mongoClient.connect()
    .then(() => db = mongoClient.db())
    .catch(e => console.log(e.message));

app.post("/participants", async(req, res) => {
    const { name } = req.body;
    //if (!name || typeof (name) !== "string") {return res.sendStatus(422);}

    const participantsSchema = joi.object({
        name: joi.string().min(1).required()
    })

    const validateParticipants = participantsSchema.validate(req.body, { abortEarly: false });

    if (validateParticipants.error) {
        const errors = validateParticipants.error.details.map(detail => detail.message);
        return res.status(422).send(errors);
    }

    const user = await db.collection("participants").findOne({ name: name })
    if(user) {
        return res.sendStatus(409);
    }

    await db.collection("participants").insertOne({
        name: name,
        lastStatus: Date.now()
    })
    await db.collection("message").insertOne({
            from: name,
            to: 'Todos',
            text: 'entra na sala...',
            type: 'status',
            time: dayjs().format('HH:mm:ss')
    })
    res.sendStatus(201);
})
app.get("/participants", (req, res) => {

    db.collection("participants").find().toArray()
        .then(data => {
            return res.send(data)
        })
        .catch(error => {
            return res.status(500).send(error.message);
        })
})

app.post("/messages", (req, res) => {
    res.send("OK");
})

app.get("/messages", (req, res) => {
    res.send("OK");
})

app.post("/status", (req, res) => {
    const { user } = req.headers;
    if (!user) {
        return res.sendStatus(404);
    }
    res.sendStatus(200);
})





const PORT = 5000;
app.listen(PORT, () => console.log(`O servidor está na porta ${PORT}`));