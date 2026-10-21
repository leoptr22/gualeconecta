import 'dotenv/config';
import express from 'express';
import { createApp } from './app.js';
import { createRepository } from './repository.js';
import { createMediaStorage } from './media.js';
import { startPublicationCleanup } from './publication-cleanup.js';
const repository=createRepository();
startPublicationCleanup(repository,createMediaStorage().directory);
const app=createApp(repository);app.use(express.static('dist'));app.get('/{*path}',(req,res)=>res.sendFile('index.html',{root:'dist'}));app.listen(process.env.PORT||3001,'127.0.0.1',()=>console.log('API lista en http://127.0.0.1:3001'));


