If you get the error `RequestError: unsupported` with Node.js >=v17 then you might have a PFX file using a deprecated algorithm.
Try this instead (tested on v17-18):

```
NODE_OPTIONS=--openssl-legacy-provider npx ts-node --esm create-enrollments-file.ts
```