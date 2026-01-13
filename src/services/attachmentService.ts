
import { api } from './api';
import type { Attachment } from '@/types/feature.types';

interface UploadAttachmentResponse {
  id: string;
  urbanObjectId: string;
  fileName: string;
  fileUrl: string;
  fileType: string;
  fileSize: number;
  description?: string;
  uploadedById: string;
  uploadedAt: string;
  updatedAt: string;
  deletedAt?: string;
}

interface DeleteAttachmentResponse {
  message: string;
}

class AttachmentService {
  private baseURL = '/urban-objects';

  async uploadAttachment(
    urbanObjectId: string,
    file: File,
    description?: string
  ): Promise<UploadAttachmentResponse> {
    try {
      this.validateFile(file);

      const formData = new FormData();
      formData.append('file', file);
      if (description) {
        formData.append('description', description);
      }

      const response = await api.post<{ data: UploadAttachmentResponse }>(
        `${this.baseURL}/${urbanObjectId}/attachments`,
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        }
      );

      const data = response.data.data;
      return {
        ...data,
        fileSize: typeof data.fileSize === 'string' ? parseInt(data.fileSize, 10) : data.fileSize,
      } as UploadAttachmentResponse;
    } catch (error) {
      console.error('Error uploading attachment:', error);
      throw error;
    }
  }


  async getAttachments(urbanObjectId: string): Promise<Attachment[]> {
    try {
      const response = await api.get<{ data: Attachment[] }>(
        `${this.baseURL}/${urbanObjectId}/attachments`
      );

      // Normalize fileSize to number
      const attachments = response.data.data.map(att => ({
        ...att,
        fileSize: typeof att.fileSize === 'string' ? parseInt(att.fileSize, 10) : att.fileSize,
      }));

      return attachments as Attachment[];
    } catch (error) {
      console.error('Error fetching attachments:', error);
      throw error;
    }
  }


  async deleteAttachment(urbanObjectId: string, attachmentId: string): Promise<void> {
    try {
      await api.delete(
        `${this.baseURL}/${urbanObjectId}/attachments/${attachmentId}`
      );
    } catch (error) {
      console.error('Error deleting attachment:', error);
      throw error;
    }
  }


  private validateFile(file: File): void {
    const imageMimeTypes = ['image/jpeg', 'image/png'];
    const documentMimeTypes = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];

    const imageExtensions = ['.jpg', '.jpeg', '.png'];
    const documentExtensions = ['.pdf', '.doc', '.docx'];

    const allMimeTypes = [...imageMimeTypes, ...documentMimeTypes];
    const fileName = file.name.toLowerCase();
    const isValidExtension = [...imageExtensions, ...documentExtensions].some(ext => fileName.endsWith(ext));

    // Check MIME type
    if (!allMimeTypes.includes(file.type) && !isValidExtension) {
      throw new Error(
        'Định dạng file không được hỗ trợ. Hỗ trợ: JPG, PNG (5MB), PDF, DOC, DOCX (10MB)'
      );
    }

    // Check file size
    const isImage = imageMimeTypes.includes(file.type) || imageExtensions.some(ext => fileName.endsWith(ext));
    const maxSize = isImage ? 5 * 1024 * 1024 : 10 * 1024 * 1024; // 5MB for images, 10MB for documents

    if (file.size > maxSize) {
      const maxSizeMB = isImage ? 5 : 10;
      throw new Error(
        `File quá lớn. Kích thước tối đa: ${maxSizeMB}MB`
      );
    }
  }

  getFileUrl(attachment: Attachment): string {
    return attachment.fileUrl;
  }

  isImage(attachment: Attachment): boolean {
    return attachment.fileType?.startsWith('image/') ?? false;
  }


  formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
  }
}

export const attachmentService = new AttachmentService();
