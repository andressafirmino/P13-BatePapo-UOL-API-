import express from "express";
import cors from "cors";
import { MongoClient, ObjectId } from "mongodb";
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

app.post("/participants", async (req, res) => {
    const { name } = req.body;
    const participantsSchema = joi.object({
        name: joi.string().min(1).required()
    })
    const validateParticipants = participantsSchema.validate(req.body, { abortEarly: false });

    if (validateParticipants.error) {
        const errors = validateParticipants.error.details.map(detail => detail.message);
        return res.status(422).send(errors);
    }

    try {
        const user = await db.collection("participants").findOne({ name: name });
        if (user) {
            return res.sendStatus(409);
        }
        await db.collection("participants").insertOne({
            name: name,
            lastStatus: Date.now()
        })
        await db.collection("messages").insertOne({
            from: name,
            to: 'Todos',
            text: 'entra na sala...',
            type: 'status',
            time: dayjs().format('HH:mm:ss')
        })
        res.sendStatus(201);
    } catch (e) {
        res.status(500).send(e.message);
    }

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

app.post("/messages", async (req, res) => {
    const { user } = req.headers;
    const { to, text, type } = req.body;
    const messageSchema = joi.object({
        to: joi.string().min(1).required(),
        text: joi.string().min(1).required(),
        type: joi.valid('message', 'private_message').required()
    })
    const validateMessage = messageSchema.validate(req.body, { abortEarly: false });
    if (validateMessage.error) {
        const errors = validateMessage.error.details.map(detail => detail.message);
        return res.status(422).send(errors);
    }
    try {
        const from = await db.collection("participants").findOne({ name: user });
        if (!from) {
            return res.sendStatus(422);
        }
        await db.collection("messages").insertOne({
            from: from.name,
            to: to,
            text: text,
            type: type,
            time: dayjs().format('HH:mm:ss')
        })
        res.sendStatus(201);
    } catch (e) {
        res.status(500).send(e.message);
    }
})

app.get("/messages", async (req, res) => {
    const { user } = req.headers;
    const { limit } = req.query;
    const limitSchema = joi.object({
        limit: joi.number().min(1)
    })
    const validateLimit = limitSchema.validate((req.query), { abortEarly: false });
    if (validateLimit.error) {
        const errors = validateLimit.error.details.map(detail => detail.message);
        return res.status(422).send(errors);
    }
    try {
        const messages = await db.collection("messages").find({ $or: [{ to: "Todos" }, { to: user }, { from: user }] }).toArray();
        let lastMessages = [...messages.slice(-limit)];
        res.send(lastMessages);

    } catch (e) {
        res.status(500).send(e.message);
    }


})

app.post("/status", async (req, res) => {
    const { user } = req.headers;
    if (!user) {
        return res.sendStatus(404);
    }
    try {
        const from = await db.collection("participants").findOne({ name: user });
        if (!from) {
            return res.sendStatus(404);
        }
        await db.collection("participants").updateOne(
            { name: user },
            { $set: { lastStatus: Date.now() } }
        )
        res.sendStatus(200);
    } catch (e) {
        res.status(500).send(e.message);
    }
})

setInterval(async () => {
    let users = await db.collection("participants").find().toArray();
    await db.collection("participants").deleteMany({ lastStatus: { $lt: Date.now() - 10000 } });
    let deleteUser = await db.collection("participants").find().toArray();

    for (let j = 0; j < users.length; j++) {
        if (!deleteUser.includes(users[j])) {
            db.collection("messages").insertOne({
                from: users[j].name,
                to: 'Todos',
                text: 'sai da sala...',
                type: 'status',
                time: dayjs().format('HH:mm:ss')
            })
        }
    }
}, 150000);

app.delete("/messages/:id", async (req, res) => {
    const { id } = req.params;
    const { user } = req.headers;

    try {
        const userRequest = await db.collection("messages").findOne({ _id: new ObjectId(id) });
        if (!userRequest) {
            return res.sendStatus(404);
        }
        if (userRequest.from !== user) {
            return res.sendStatus(401);
        }
        await db.collection("messages").deleteOne({ _id: new ObjectId(id) });

        res.sendStatus(200);
    } catch (e) {
        res.status(500).send(e.message);
    }
})

app.put("/messages/:id", async (req, res) => {
    const { user } = req.headers;
    const { id } = req.params;
    const { to, text, type } = req.body;
    const messageSchema = joi.object({
        to: joi.string().min(1),
        text: joi.string().min(1),
        type: joi.valid('message', 'private_message')
    })
    const validateMessage = messageSchema.validate(req.body, { abortEarly: false });
    if (validateMessage.error) {
        const errors = validateMessage.error.details.map(detail => detail.message);
        return res.status(422).send(errors);
    }
    try {
        const from = await db.collection("participants").findOne({ name: user });
        if (!from) {
            return res.sendStatus(422);
        }
        const userRequest = await db.collection("messages").findOne({ _id: new ObjectId(id) });
        if (!userRequest) {
            return res.sendStatus(404);
        }
        if (userRequest.from !== user) {
            return res.sendStatus(401);
        }

        const counter = await db.collection("messages").updateOne(
            { _id: new ObjectId(id) },
            {
                $set:
                {
                    from: user,
                    to: to,
                    text: text,
                    type: type,
                    time: dayjs().format('HH:mm:ss')
                }
            })
        if (counter.matchedCount === 0) {
            return res.sendStatus(404);
        }
        res.sendStatus(200);
    } catch (e) {
        res.status(500).send(e.message);
    }
})

const PORT = 5000;
app.listen(PORT, () => console.log(`O servidor está na porta ${PORT}`));