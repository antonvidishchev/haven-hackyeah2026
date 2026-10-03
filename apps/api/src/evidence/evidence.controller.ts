import { Controller, Delete, Get, HttpCode, Param, Post, Req, Res } from '@nestjs/common';
import { safeFileName, type SessionPrincipal } from '@haven/shared';
import type { FastifyReply, FastifyRequest } from 'fastify';
import { CurrentPrincipal, Roles } from '../auth/decorators.js';
import { apiError } from '../common/http-exception.filter.js';
import { RecordIdPipe } from '../common/id.pipe.js';
import { reportIdPipe } from '../reports/reports.controller.js';
import { EvidenceService } from './evidence.service.js';
import { inlineDisposition } from './range.js';

const evidenceIdPipe = () => new RecordIdPipe('evidence_not_found', 'We could not find that file');

const noFile = () =>
  apiError(400, 'validation_failed', 'Attach one file in the "file" field', [
    { path: ['file'], message: 'Required' },
  ]);

@Controller()
export class EvidenceController {
  constructor(private readonly evidence: EvidenceService) {}

  /** Multipart upload with a single `file` part. */
  @Roles('guest', 'resident')
  @Post('reports/:id/evidence')
  @HttpCode(201)
  async upload(
    @CurrentPrincipal() principal: SessionPrincipal,
    @Param('id', reportIdPipe()) reportId: string,
    @Req() request: FastifyRequest,
  ) {
    if (!request.isMultipart()) throw noFile();
    const file = await request.file();
    if (!file || file.fieldname !== 'file') {
      file?.file.resume();
      throw noFile();
    }
    return this.evidence.upload(principal, reportId, file);
  }

  @Roles('guest', 'resident')
  @Delete('evidence/:id')
  @HttpCode(204)
  async remove(
    @CurrentPrincipal() principal: SessionPrincipal,
    @Param('id', evidenceIdPipe()) id: string,
  ) {
    await this.evidence.remove(principal, id);
  }

  @Get('evidence/:id/media')
  async media(
    @CurrentPrincipal() principal: SessionPrincipal,
    @Param('id', evidenceIdPipe()) id: string,
    @Req() request: FastifyRequest,
    @Res() reply: FastifyReply,
  ) {
    const media = await this.evidence.media(principal, id, request.headers.range);
    void reply
      .header('Accept-Ranges', 'bytes')
      .header('Cache-Control', 'private, no-store')
      .header('X-Content-Type-Options', 'nosniff');

    if (media.status === 416) {
      return reply
        .status(416)
        .header('Content-Range', `bytes */${media.size}`)
        .send({
          error: {
            code: 'range_not_satisfiable',
            message: 'The requested range is not available',
          },
        });
    }

    const { range, size, evidence } = media;
    void reply
      .status(media.status)
      .header('Content-Type', evidence.media_type)
      .header('Content-Disposition', inlineDisposition(safeFileName(evidence.file_name)))
      .header('Content-Length', range ? range.end - range.start + 1 : size);
    if (range) void reply.header('Content-Range', `bytes ${range.start}-${range.end}/${size}`);
    return reply.send(media.stream);
  }
}
