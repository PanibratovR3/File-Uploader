const express = require("express");
const path = require("path");
const session = require("express-session");
const prisma = require("./config/prismaClient");
const { PrismaSessionStore } = require("@quixo3/prisma-session-store");
const passport = require("./config/passport");
const multer = require("multer");
require("dotenv").config({ quiet: true });

const indexConroller = require("./controllers/indexController");
const userController = require("./controllers/userController");
const folderController = require("./controllers/folderController");
const fileController = require("./controllers/fileController");

const storage = multer.diskStorage({
  destination: (request, file, cb) => {
    cb(null, path.join(__dirname, "public/data/uploads"));
  },
  filename: (request, file, cb) => {
    const date = new Date();
    const uploadDate = date.toLocaleDateString().replaceAll("/", "-");
    const uploadTime = date.getUTCMilliseconds();
    const extName = path.extname(file.originalname);
    const fileNameWithoutExtension = path.basename(file.originalname, extName);
    cb(
      null,
      fileNameWithoutExtension + "_" + uploadDate + "_" + uploadTime + extName
    );
  },
});

const upload = multer({ storage: storage });
const assetsPath = path.join(__dirname, "public");
const PORT = process.env.PORT || 3000;

const app = express();
app.use(
  session({
    cookie: {
      maxAge: 7 * 24 * 60 * 60 * 1000,
    },
    secret: process.env.SECRET,
    resave: true,
    saveUninitialized: true,
    store: new PrismaSessionStore(prisma, {
      checkPeriod: 2 * 60 * 1000,
      dbRecordIdIsSessionId: true,
      dbRecordIdFunction: undefined,
    }),
  })
);

app.use(passport.session());
app.use(express.urlencoded({ extended: true }));
app.set("views", path.join(__dirname, "views"));
app.set("view engine", "ejs");
app.use(express.static(assetsPath));

// Controller for main page
app.get("/", indexConroller.indexGet);

// Controller for users
app.get("/sign-up", userController.signUpGet);
app.post("/sign-up", userController.signUpPost);
app.get("/log-in", userController.logInGet);
app.post(
  "/log-in",
  passport.authenticate("local", {
    successRedirect: "/",
    failureRedirect: "/",
  })
);
app.get("/log-out", userController.logOut);

// Controller for folders
app.get("/create-folder", folderController.createFolderGet);
app.post("/create-folder", folderController.createFolderPost);
app.get("/folders/:id/update", folderController.updateFolderGet);
app.post("/folders/:id/update", folderController.updateFolderPost);
app.post("/folders/:id/delete", folderController.deleteFolderPost);

// Controllers for files
app.get("/folders/:id/files", fileController.filesGet);
app.post(
  "/folders/:id/files/create",
  upload.single("uploadFile"),
  fileController.createFilePost
);
app.post(
  "/folders/:folderId/files/:fileId/delete",
  fileController.deleteFilePost
);
app.get(
  "/folders/:folderId/files/:fileId/download",
  fileController.downloadFile
);

app.use((error, request, response, next) => {
  console.error(error);
});

app.listen(PORT, () =>
  console.log(`Server was launched: http://localhost:${PORT}/`)
);
