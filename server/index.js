const bodyParser = require("body-parser");
const cors = require("cors");
const express = require("express");

const app = express();

app.use(bodyParser());
app.use(cors());

const OpenTok = require("opentok"),
  opentok = new OpenTok(
    process.env.REACT_APP_OT_API_KEY,
    process.env.OT_SECRET
  );

app.get("/session", (_, res) => {
  opentok.createSession(
    {
      mediaMode: "routed",
    },
    (error, session) => {
      if (error) {
        res.send(error);
      }
      const { sessionId } = session;
      const token = session.generateToken();
      res.send({ sessionId, token });
    }
  );
});

app.listen(3001, () => {
  console.log("started");
});
