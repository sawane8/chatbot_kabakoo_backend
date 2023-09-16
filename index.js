import OpenAI from "openai";
import { createRequire } from "module";
import Express from "express"
import bodyparser from "body-parser"

const require = createRequire(import.meta.url);


const util = require('util');
const mysql = require('mysql');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

const app = Express()

const openai = new OpenAI({
    apiKey: "", //"" //
    organization:""
});

const con = mysql.createPool({
	host: "",
	user: "",
	password: "",
	database: ""
});

const query = util.promisify(con.query).bind(con);


app.use(bodyparser.json());

app.post("/login", (req, res) => {

  const { email, password } = req.body

  try {

    con.query('SELECT * FROM users WHERE email = ? AND password = ?', [email, password], (err, result) => {
      if (err) throw err
      if (result.length > 0) {

        const token = jwt.sign({email, password}, "cfa81a5ca2fb524fc8a7ed1c1224c56b", { expiresIn: "30d" })

        res.json({ok: "Success", token })
      }else {
        res.json({ok: "failed", token: "" })
      }

    })
  } catch (e) {
    console.log(e);
    res.json({ok: "Error login"})
  }

})

.post("/ai", async (req, res) => {

  const prompt = req.body.prompt

  const lastreponses = [{ role: "system", content: "You are a helpful assistant." }]

  const selectResponses = await query('SELECT * FROM history ORDER BY ID DESC LIMIT 1')

  delete selectResponses[0].id

  if (selectResponses.length > 0) {
    lastreponses.push(selectResponses[0])
  }

  try {

    const completion = await openai.chat.completions.create({
       model: "gpt-3.5-turbo-16k",
       messages: [
         ...lastreponses,
         { role: "user", content: prompt }],
     });

     const data = {
       role: "system",
       content: `${completion.choices[0].message.content}`
     }

     const insertResponse = query('INSERT INTO history SET ? ', [data])

    res.json({ok: "Success", message: completion.choices[0].message.content})
  } catch (e) {
    console.log(e);
    res.json({ok: "Error"})
  }
})

.post("/image_generator", async (req, res) => {

  const prompt = req.body.prompt

  try {
    const response = await openai.images.generate({
      prompt: prompt,
      n: 5,
      size: "512x512"
    });

    res.json({ok: "Success", urls: response.data})

  } catch (e) {
    console.log(e);
    res.json({ok: "Error"})
  }

})

app.listen(2000, () => console.log('connected'))
