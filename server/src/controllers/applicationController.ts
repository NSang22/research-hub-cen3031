import { Request, Response, NextFunction } from 'express';
import { supabaseAdmin } from '../config/supabase';
import { ApiResponse } from '@research-hub/shared';
import { AppError } from '../middleware/errorHandler';
import {
  Application,
  ApplicationWithPosition,
  WITHDRAWABLE_STATUSES,
} from '../types/application';

// ---------------------------------------------------------------------------
// GET /api/applications/mine
// ---------------------------------------------------------------------------

export async function getMyApplications(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { student_id } = req.query;

    if (!student_id || typeof student_id !== 'string') {
      const response: ApiResponse<never> = {
        success: false,
        error: 'student_id query parameter is required',
      };
      res.status(400).json(response);
      return;
    }

    const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!UUID_RE.test(student_id)) {
      const response: ApiResponse<never> = {
        success: false,
        error: 'student_id must be a valid UUID',
      };
      res.status(400).json(response);
      return;
    }

    // Join research_positions to surface title and department alongside each application
    const { data, error } = await supabaseAdmin
      .from('applications')
      .select(`
        *,
        research_positions!position_id (
          title,
          department
        )
      `)
      .eq('student_id', student_id)
      .order('created_at', { ascending: false });

    if (error) {
      const err: AppError = new Error(error.message);
      err.statusCode = 500;
      return next(err);
    }

    // Flatten nested research_positions into top-level fields
    const enriched: ApplicationWithPosition[] = (data ?? []).map((row) => {
      const { research_positions: pos, ...rest } = row as Application & {
        research_positions: { title: string; department: string } | null;
      };
      return {
        ...rest,
        position_title: pos?.title ?? '',
        position_department: pos?.department ?? '',
      };
    });

    const response: ApiResponse<ApplicationWithPosition[]> = {
      success: true,
      data: enriched,
    };
    res.json(response);
  } catch (err) {
    next(err);
  }
}

// ---------------------------------------------------------------------------
// GET /api/applications/:id
// ---------------------------------------------------------------------------

export async function getApplicationById(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { id } = req.params;

    const { data, error } = await supabaseAdmin
      .from('applications')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (error) {
      const err: AppError = new Error(error.message);
      err.statusCode = 500;
      return next(err);
    }

    if (!data) {
      const response: ApiResponse<never> = {
        success: false,
        error: 'Application not found',
      };
      res.status(404).json(response);
      return;
    }

    const response: ApiResponse<Application> = { success: true, data };
    res.json(response);
  } catch (err) {
    next(err);
  }
}

// ---------------------------------------------------------------------------
// PUT /api/applications/:id/withdraw
// ---------------------------------------------------------------------------

export async function withdrawApplication(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { id } = req.params;

    // Fetch the current application to check status before mutating
    const { data: existing, error: fetchError } = await supabaseAdmin
      .from('applications')
      .select('id, status')
      .eq('id', id)
      .maybeSingle();

    if (fetchError) {
      const err: AppError = new Error(fetchError.message);
      err.statusCode = 500;
      return next(err);
    }

    if (!existing) {
      const response: ApiResponse<never> = {
        success: false,
        error: 'Application not found',
      };
      res.status(404).json(response);
      return;
    }

    const currentStatus = (existing as { status: string }).status;

    // Only pending or reviewing applications may be withdrawn
    if (!WITHDRAWABLE_STATUSES.includes(currentStatus as Application['status'])) {
      const response: ApiResponse<never> = {
        success: false,
        error: `Cannot withdraw an application with status '${currentStatus}'. Only pending or reviewing applications can be withdrawn`,
      };
      res.status(409).json(response);
      return;
    }

    const { data, error } = await supabaseAdmin
      .from('applications')
      .update({ status: 'withdrawn' })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      const err: AppError = new Error(error.message);
      err.statusCode = 500;
      return next(err);
    }

    const response: ApiResponse<Application> = {
      success: true,
      data,
      message: 'Application withdrawn successfully',
    };
    res.json(response);
  } catch (err) {
    next(err);
  }
}

// ---------------------------------------------------------------------------
// POST /api/applications
// ---------------------------------------------------------------------------

export async function submitApplication(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { student_id, position_id, personal_statement } = req.body;

    // Verify student_id references an existing student_profile
    const { data: student, error: studentError } = await supabaseAdmin
      .from('student_profiles')
      .select('id')
      .eq('id', student_id)
      .maybeSingle();

    if (studentError) {
      const err: AppError = new Error('Database error while verifying student profile');
      err.statusCode = 500;
      return next(err);
    }

    if (!student) {
      const response: ApiResponse<never> = {
        success: false,
        error: 'Student profile not found for the provided student_id',
      };
      res.status(404).json(response);
      return;
    }

    // Verify position_id references an existing research_position
    const { data: position, error: positionError } = await supabaseAdmin
      .from('research_positions')
      .select('id, status')
      .eq('id', position_id)
      .maybeSingle();

    if (positionError) {
      const err: AppError = new Error('Database error while verifying research position');
      err.statusCode = 500;
      return next(err);
    }

    if (!position) {
      const response: ApiResponse<never> = {
        success: false,
        error: 'Research position not found for the provided position_id',
      };
      res.status(404).json(response);
      return;
    }

    // Prevent applying to a closed or filled position
    if ((position as { status: string }).status !== 'open') {
      const response: ApiResponse<never> = {
        success: false,
        error: 'Applications are only accepted for open positions',
      };
      res.status(409).json(response);
      return;
    }

    const { data, error } = await supabaseAdmin
      .from('applications')
      .insert({
        student_id,
        position_id,
        personal_statement: personal_statement?.trim() ?? null,
        status: 'pending',
      })
      .select()
      .single();

    if (error) {
      // Unique constraint violation — student already applied to this position
      if (error.code === '23505') {
        const response: ApiResponse<never> = {
          success: false,
          error: 'You have already applied to this position',
        };
        res.status(409).json(response);
        return;
      }
      const err: AppError = new Error(error.message);
      err.statusCode = 500;
      return next(err);
    }

    const response: ApiResponse<Application> = { success: true, data };
    res.status(201).json(response);
  } catch (err) {
    next(err);
  }
}
