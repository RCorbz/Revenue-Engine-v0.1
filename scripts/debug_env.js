import { spawnSync } from 'node:child_process';
const result = spawnSync('python', ['--version'], { encoding: 'utf-8' });
console.log('Version:', result.stdout || result.stderr);
const where = spawnSync('where', ['python'], { encoding: 'utf-8' });
console.log('Where:', where.stdout || where.stderr);
const cv2 = spawnSync('python', ['-c', 'import cv2; print("CV2 FOUND")'], { encoding: 'utf-8' });
console.log('CV2 Check:', cv2.stdout || cv2.stderr);
