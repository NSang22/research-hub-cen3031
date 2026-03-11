import { Request, Response, NextFunction } from 'express';
import { supabaseAdmin } from '../config/supabase';
import { ApiResponse } from '@research-hub/shared';
import { AppError } from '../middleware/errorHandler';
import {
  StudyListing,
  StudyStatus,
  STUDY_STATUSES,
  UPDATE_ALLOWED_FIELDS,
  UpdateStudyBody,
} from '../types/studyListing';

// ---------------------------------------------------------------------------
// GET /api/studies
// ---------------------------------------------------------------------------

export async function listStudies(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { pi_id, status } = req.query;

    // Validate status query param if provided
    const statusFilter = (status as string) ?? 'recruiting';
    if (!STUDY_STATUSES.includes(statusFilter as StudyStatus)) {
      const response: ApiResponse<never> = {
        success: false,
        error: `status must be one of: ${STUDY_STATUSES.join(', ')}`,
      };
      res.status(400).json(response);
      return;
    }

    let query = supabaseAdmin
      .from('study_listings')
      .select('*')
      .eq('status', statusFilter)
      .order('created_at', { ascending: false });

    if (pi_id && typeof pi_id === 'string') {
      query = query.eq('pi_id', pi_id);
    }

    const { data, error } = await query;

    if (error) {
      const err: AppError = new Error(error.message);
      err.statusCode = 500;
      return next(err);
    }

    const response: ApiResponse<StudyListing[]> = { success: true, data: data ?? [] };
    res.json(response);
  } catch (err) {
    next(err);
  }
}

// ---------------------------------------------------------------------------
// POST /api/studies
// ---------------------------------------------------------------------------

export async function createStudy(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { pi_id, title, eligibility_criteria, compensation_details, scheduling_options } =
      req.body;

    // Verify the pi_id references an existing pi_profile
    const { data: pi, error: piError } = await supabaseAdmin
      .from('pi_profiles')
      .select('id')
      .eq('id', pi_id)
      .maybeSingle();

    if (piError) {
      const err: AppError = new Error('Database error while verifying PI profile');
      err.statusCode = 500;
      return next(err);
    }

    if (!pi) {
      const response: ApiResponse<never> = {
        success: false,
        error: 'PI profile not found for the provided pi_id',
      };
      res.status(404).json(response);
      return;
    }

    const { data, error } = await supabaseAdmin
      .from('study_listings')
      .insert({
        pi_id,
        title: title.trim(),
        eligibility_criteria: eligibility_criteria?.trim() ?? null,
        compensation_details: compensation_details?.trim() ?? null,
        scheduling_options: scheduling_options ?? {},
        status: 'recruiting',
      })
      .select()
      .single();

    if (error) {
      const err: AppError = new Error(error.message);
      err.statusCode = 500;
      return next(err);
    }

    const response: ApiResponse<StudyListing> = { success: true, data };
    res.status(201).json(response);
  } catch (err) {
    next(err);
  }
}
