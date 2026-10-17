import { EventEmitter } from 'events';
import mongoose from 'mongoose';
import Deployment from '../models/Deployment.js';
import Project from '../models/Project.js';
import buildWorker, { killProcessTree } from './buildWorker.js';

class BuildQueue extends EventEmitter {
  constructor() {
    super();
    this.concurrency = parseInt(process.env.MAX_CONCURRENT_BUILDS, 10) || 2;
    this.activeJobs = new Map(); // deploymentId -> { deploymentId, startedAt }
    this.activeProcesses = new Map(); // deploymentId -> ChildProcess
    this.cancelledJobs = new Set(); // Set of deploymentIds marked for cancellation
    this.queue = []; // Array of deploymentIds
    this.isProcessing = false;
  }

  /**
   * Enqueue a deployment job
   */
  async enqueueJob(deploymentId) {
    const depIdStr = String(deploymentId);

    // Prevent duplicate entries in active or pending queue
    if (this.activeJobs.has(depIdStr) || this.queue.includes(depIdStr)) {
      console.log(`[BuildQueue] Job ${depIdStr} is already queued or processing.`);
      return;
    }

    this.queue.push(depIdStr);
    console.log(`[BuildQueue] Enqueued deployment ${depIdStr}. Queue length: ${this.queue.length}`);

    // Trigger queue processor
    this.processNext();
  }

  /**
   * Cancel a pending or actively running deployment
   */
  async cancelJob(deploymentId) {
    const depIdStr = String(deploymentId);
    this.cancelledJobs.add(depIdStr);

    // 1. If currently in pending queue, remove immediately
    const queueIndex = this.queue.indexOf(depIdStr);
    if (queueIndex > -1) {
      this.queue.splice(queueIndex, 1);
      if (mongoose.Types.ObjectId.isValid(depIdStr)) {
        await Deployment.findByIdAndUpdate(depIdStr, {
          status: 'CANCELLED',
          completedAt: new Date(),
          error: 'Deployment cancelled by user while queued'
        });
      }
      console.log(`[BuildQueue] Cancelled queued deployment ${depIdStr}`);
      return true;
    }

    // 2. If actively executing a child process, kill it
    const activeProcess = this.activeProcesses.get(depIdStr);
    if (activeProcess) {
      console.log(`[BuildQueue] Killing active worker process for deployment ${depIdStr}`);
      killProcessTree(activeProcess);
      this.activeProcesses.delete(depIdStr);
      return true;
    }

    // 3. If marked as active job in JS
    if (this.activeJobs.has(depIdStr)) {
      if (mongoose.Types.ObjectId.isValid(depIdStr)) {
        await Deployment.findByIdAndUpdate(depIdStr, {
          status: 'CANCELLED',
          completedAt: new Date(),
          error: 'Deployment cancelled by user'
        });
      }
      this.activeJobs.delete(depIdStr);
      return true;
    }

    return false;
  }

  /**
   * Process the next job in the queue
   */
  async processNext() {
    if (this.activeJobs.size >= this.concurrency) {
      return;
    }

    if (this.queue.length === 0) {
      return;
    }

    const deploymentId = this.queue.shift();
    const depIdStr = String(deploymentId);

    // Check if was cancelled before processing started
    if (this.cancelledJobs.has(depIdStr)) {
      this.cancelledJobs.delete(depIdStr);
      await Deployment.findByIdAndUpdate(depIdStr, {
        status: 'CANCELLED',
        completedAt: new Date(),
        error: 'Deployment cancelled by user before execution'
      });
      // Continue next
      this.processNext();
      return;
    }

    this.activeJobs.set(depIdStr, {
      deploymentId: depIdStr,
      startedAt: Date.now()
    });

    console.log(`[BuildQueue] Starting execution of deployment ${depIdStr}. Active builds: ${this.activeJobs.size}`);

    // Asynchronously run worker without blocking event loop
    (async () => {
      try {
        await buildWorker.executeBuild(
          depIdStr,
          this.activeProcesses,
          (id) => this.cancelledJobs.has(String(id))
        );
        console.log(`[BuildQueue] Successfully completed deployment ${depIdStr}`);
      } catch (err) {
        console.warn(`[BuildQueue] Deployment ${depIdStr} finished with status: ${err.message}`);
      } finally {
        this.activeJobs.delete(depIdStr);
        this.activeProcesses.delete(depIdStr);
        this.cancelledJobs.delete(depIdStr);

        // Process next queued job
        this.processNext();
      }
    })();
  }

  /**
   * Startup cleanup & recovery:
   * Marks uncompleted jobs from previous crash as FAILED, and recovers QUEUED jobs
   */
  async recoverOnStartup() {
    try {
      // Find jobs interrupted by crash/restart
      const interrupted = await Deployment.find({
        status: { $in: ['PREPARING', 'BUILDING', 'PUBLISHING'] }
      });

      for (const dep of interrupted) {
        dep.status = 'FAILED';
        dep.completedAt = new Date();
        dep.error = 'Build interrupted by server restart or worker crash';
        dep.logs.push({
          timestamp: new Date(),
          message: '[System] Worker process interrupted by server restart. Marked as failed.'
        });
        await dep.save();
      }

      if (interrupted.length > 0) {
        console.log(`[BuildQueue Recovery] Flagged ${interrupted.length} interrupted builds as FAILED.`);
      }

      // Resume pending QUEUED deployments
      const queued = await Deployment.find({ status: 'QUEUED' }).sort({ createdAt: 1 });
      for (const dep of queued) {
        this.enqueueJob(dep._id);
      }

      if (queued.length > 0) {
        console.log(`[BuildQueue Recovery] Resumed ${queued.length} queued deployments.`);
      }
    } catch (err) {
      console.error('[BuildQueue Recovery Error]:', err.message);
    }
  }
}

const buildQueue = new BuildQueue();
export default buildQueue;
