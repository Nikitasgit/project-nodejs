import http from "node:http";
import dotenv from "dotenv";
import path from "node:path";
import pug from "pug";
import { getMenuItems } from "./utils/constants.js";
import fs from "node:fs";
import { user } from "./data/users.js";
import querystring from "node:querystring";

dotenv.config();

const { HOST, PORT } = process.env;

const dirname = import.meta.dirname;
const viewPath = path.join(dirname, "view");
const assetsPath = path.join(dirname, "assets");
const dataPath = path.join(dirname, "data");

const server = http.createServer((req, res) => {
  const url = req.url.replace("/", "");
  const menuItems = getMenuItems(req.url);

  if (url === "favicon.ico") {
    res.writeHead(200, {
      "content-type": "image/x-icon",
    });
    res.end();
    return;
  }
  if (url.startsWith("style")) {
    const stylesheetName = url.split("/").pop();
    const stylesheet = fs.readFileSync(path.join(assetsPath, stylesheetName));

    res.writeHead(200, {
      "content-type": "text/css",
    });
    res.end(stylesheet);
    return;
  }
  if (url === "") {
    res.writeHead(200, { "Content-type": "text/html" });
    pug.renderFile(
      path.join(viewPath, "home.pug"),
      { menuItems, user },
      (err, data) => {
        if (err) throw err;
        res.end(data);
      }
    );
    return;
  }
  if (url === "about-me") {
    res.writeHead(200, { "Content-type": "text/html" });

    pug.renderFile(
      path.join(viewPath, "aboutme.pug"),
      { menuItems },
      (err, data) => {
        if (err) throw err;
        res.end(data);
      }
    );
    return;
  }
  if (url === "references") {
    res.writeHead(200, { "Content-type": "text/html" });

    pug.renderFile(
      path.join(viewPath, "references.pug"),
      { menuItems },
      (err, data) => {
        if (err) throw err;
        res.end(data);
      }
    );
    return;
  }
  if (url === "contact-me" && req.method === "GET") {
    res.writeHead(200, { "Content-type": "text/html" });

    pug.renderFile(
      path.join(viewPath, "contactme.pug"),
      { menuItems },
      (err, data) => {
        if (err) throw err;
        res.end(data);
      }
    );
    return;
  }
  if (url === "contact-me" && req.method === "POST") {
    let body = "";

    req.on("data", (chunk) => {
      body += chunk.toString();
    });

    req.on("end", () => {
      const data = querystring.parse(body);

      if (!data.email?.trim() || !data.message?.trim()) {
        res.writeHead(400, { "Content-Type": "text/html" });
        pug.renderFile(
          path.join(viewPath, "contactme.pug"),
          {
            menuItems,
            error: "Merci de remplir tous les champs",
          },
          (err, html) => {
            if (err) throw err;
            res.end(html);
          }
        );
        return;
      }

      const filePath = path.join(dataPath, "contacts.json");
      let messages = [];
      const fileData = fs.readFileSync(filePath, "utf-8");

      if (fileData.trim().length > 0) {
        try {
          messages = JSON.parse(fileData);
        } catch (err) {
          console.error(err);
          messages = [];
        }
      } else {
        messages = [];
      }

      messages.push({
        email: data.email,
        message: data.message,
      });

      fs.writeFileSync(filePath, JSON.stringify(messages, null, 2));

      res.writeHead(200, { "Content-Type": "text/html" });
      pug.renderFile(
        path.join(viewPath, "home.pug"),
        {
          menuItems,
          user,
          toast: "Votre message a bien été envoyé !",
        },
        (err, html) => {
          if (err) throw err;
          res.end(html);
        }
      );
    });
  }
});

server.listen(PORT, HOST, () => {
  console.log(`listening on port: ${PORT}`);
});
