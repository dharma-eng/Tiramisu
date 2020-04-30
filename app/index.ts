import express from "express";
const PORT = 5000;

const server = express();
server.listen(PORT, error => {
  if (error) {
    console.error("ERROR - Unable to start server.");
  } else {
    console.log(
      `INFO - Server started on http://localhost:${PORT}`
    );
  }
});


export * from './types';
export * from './state';
export * from './lib';
export {default as Blockchain} from './Blockchain';

