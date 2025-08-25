const express = require("express");
const path = require("path");
const { body, validationResult, check } = require("express-validator");
const session = require("express-session");
const prisma = require("./config/prismaClient");
const bcrypt = require("bcryptjs");
const { PrismaSessionStore } = require("@quixo3/prisma-session-store");
const passport = require("./config/passport");
const multer = require("multer");
const fs = require("fs");
const { filesize } = require("filesize");

const indexConroller = require("./controllers/indexController");
const userController = require("./controllers/userController");
const folderController = require("./controllers/folderController");

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

const PORT = 3000;
const app = express();
app.use(
  session({
    cookie: {
      maxAge: 7 * 24 * 60 * 60 * 1000,
    },
    secret: "abracadabra",
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

app.get("/", indexConroller.indexGet);

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

app.get("/create-folder", folderController.createFolderGet);
app.post("/create-folder", folderController.createFolderPost);
app.get("/folders/:id/update", folderController.updateFolderGet);
app.post("/folders/:id/update", folderController.updateFolderPost);
app.post("/folders/:id/delete", folderController.deleteFolderPost);

app.get("/folders/:id/files", async (request, response) => {
  const { id } = request.params;
  const { name } = await prisma.folder.findUnique({
    where: {
      id: Number(id),
    },
  });
  const files = await prisma.file.findMany({
    where: {
      folderId: Number(id),
    },
  });
  for (const file of files) {
    file.size = filesize(file.size);
  }
  response.render("files", {
    fileName: name,
    folderId: id,
    files: files,
  });
});

app.post(
  "/folders/:id/files/create",
  upload.single("uploadFile"),
  async (request, response) => {
    const { id } = request.params;
    const folderId = Number(id);
    const { filename, path, size } = request.file;
    await prisma.file.create({
      data: {
        name: filename,
        size: size,
        path: path,
        folderId: folderId,
      },
    });
    await prisma.folder.update({
      where: {
        id: folderId,
      },
      data: {
        dateOfModification: new Date(),
      },
    });
    response.redirect(`/folders/${folderId}/files`);
  }
);

app.post(
  "/folders/:folderId/files/:fileId/delete",
  async (request, response) => {
    const { folderId, fileId } = request.params;
    const file = await prisma.file.findUnique({
      where: {
        id: Number(fileId),
      },
    });
    const pathToDelete = path.join(__dirname, file.path);
    fs.unlink(pathToDelete, (error) => {
      if (error) {
        return console.error(error);
      }
      console.log(
        `File ${file.name} was successfully deleted from uploading folder.`
      );
    });
    await prisma.file.delete({
      where: {
        id: file.id,
      },
    });
    await prisma.folder.update({
      where: {
        id: Number(folderId),
      },
      data: {
        dateOfModification: new Date(),
      },
    });
    response.redirect(`/folders/${folderId}/files`);
  }
);

app.get(
  "/folders/:folderId/files/:fileId/download",
  async (request, response) => {
    const { fileId } = request.params;
    const file = await prisma.file.findUnique({
      where: {
        id: Number(fileId),
      },
    });
    const fileToDownload = path.join(__dirname, file.path);
    response.download(fileToDownload);
  }
);

app.use((error, request, response, next) => {
  console.error(error);
});

app.listen(PORT, () =>
  console.log(`Server was launched: http://localhost:${PORT}/`)
);
