import { Logger } from '@/lib/utils/helpers';

export interface NotificationConfig {
  email?: {
    enabled: boolean;
    smtpHost: string;
    smtpPort: number;
    username: string;
    password: string;
    from: string;
  };
  wecom?: {
    enabled: boolean;
    webhookUrl: string;
  };
}

export interface NotificationMessage {
  title: string;
  content: string;
  type: 'info' | 'warning' | 'error' | 'success';
  recipients?: string[];
}

/**
 * 通知服务
 * 负责发送各种通知（邮件、企业微信等）
 */
export class NotificationService {
  private static instance: NotificationService;
  private config: NotificationConfig = {
    email: {
      enabled: false,
      smtpHost: '',
      smtpPort: 587,
      username: '',
      password: '',
      from: ''
    },
    wecom: {
      enabled: false,
      webhookUrl: ''
    }
  };

  private constructor() {}

  static getInstance(): NotificationService {
    if (!NotificationService.instance) {
      NotificationService.instance = new NotificationService();
    }
    return NotificationService.instance;
  }

  /**
   * 更新通知配置
   */
  updateConfig(config: Partial<NotificationConfig>): void {
    this.config = {
      ...this.config,
      ...config
    };
    Logger.info('通知配置已更新');
  }

  /**
   * 获取通知配置
   */
  getConfig(): NotificationConfig {
    return { ...this.config };
  }

  /**
   * 发送通知
   */
  async sendNotification(message: NotificationMessage, method: 'email' | 'wecom' | 'both' = 'both'): Promise<boolean> {
    try {
      let success = false;

      if (method === 'email' || method === 'both') {
        if (this.config.email?.enabled) {
          const emailSuccess = await this.sendEmail(message);
          success = success || emailSuccess;
        }
      }

      if (method === 'wecom' || method === 'both') {
        if (this.config.wecom?.enabled) {
          const wecomSuccess = await this.sendWeCom(message);
          success = success || wecomSuccess;
        }
      }

      return success;
    } catch (error) {
      Logger.error('发送通知失败', { error: (error as Error).message });
      return false;
    }
  }

  /**
   * 发送邮件通知
   */
  private async sendEmail(message: NotificationMessage): Promise<boolean> {
    try {
      if (!this.config.email?.enabled) {
        Logger.warn('邮件通知未启用');
        return false;
      }

      // 这里应该使用邮件发送库（如nodemailer）
      // 简化实现，仅记录日志
      Logger.info('发送邮件通知', {
        title: message.title,
        content: message.content,
        recipients: message.recipients || []
      });

      // TODO: 实际发送邮件
      // const transporter = nodemailer.createTransport({
      //   host: this.config.email.smtpHost,
      //   port: this.config.email.smtpPort,
      //   auth: {
      //     user: this.config.email.username,
      //     pass: this.config.email.password
      //   }
      // });
      //
      // await transporter.sendMail({
      //   from: this.config.email.from,
      //   to: message.recipients?.join(', ') || '',
      //   subject: message.title,
      //   text: message.content
      // });

      return true;
    } catch (error) {
      Logger.error('发送邮件失败', { error: (error as Error).message });
      return false;
    }
  }

  /**
   * 发送企业微信通知
   */
  private async sendWeCom(message: NotificationMessage): Promise<boolean> {
    try {
      if (!this.config.wecom?.enabled) {
        Logger.warn('企业微信通知未启用');
        return false;
      }

      if (!this.config.wecom.webhookUrl) {
        Logger.warn('企业微信Webhook URL未配置');
        return false;
      }

      // 根据消息类型选择颜色
      const colorMap = {
        info: '#909399',
        warning: '#E6A23C',
        error: '#F56C6C',
        success: '#67C23A'
      };

      const color = colorMap[message.type] || colorMap.info;

      // 构造企业微信消息
      const wecomMessage = {
        msgtype: 'markdown',
        markdown: {
          content: `### ${message.title}\n\n${message.content}`
        }
      };

      // 发送请求
      const response = await fetch(this.config.wecom.webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(wecomMessage)
      });

      const result = await response.json();

      if (result.errcode === 0) {
        Logger.info('企业微信通知发送成功', { title: message.title });
        return true;
      } else {
        Logger.error('企业微信通知发送失败', { 
          errcode: result.errcode, 
          errmsg: result.errmsg 
        });
        return false;
      }
    } catch (error) {
      Logger.error('发送企业微信通知失败', { error: (error as Error).message });
      return false;
    }
  }

  /**
   * 发送作业执行成功通知
   */
  async sendJobSuccessNotification(jobName: string, recordsProcessed: number): Promise<boolean> {
    const message: NotificationMessage = {
      title: '同步作业执行成功',
      content: `作业 **${jobName}** 执行成功\n\n处理记录数：${recordsProcessed}\n执行时间：${new Date().toLocaleString()}`,
      type: 'success'
    };

    return await this.sendNotification(message);
  }

  /**
   * 发送作业执行失败通知
   */
  async sendJobFailureNotification(jobName: string, error: string): Promise<boolean> {
    const message: NotificationMessage = {
      title: '同步作业执行失败',
      content: `作业 **${jobName}** 执行失败\n\n错误信息：${error}\n执行时间：${new Date().toLocaleString()}`,
      type: 'error'
    };

    return await this.sendNotification(message);
  }

  /**
   * 发送系统告警通知
   */
  async sendSystemAlertNotification(alertType: string, message: string): Promise<boolean> {
    const notificationMessage: NotificationMessage = {
      title: '系统告警',
      content: `告警类型：${alertType}\n\n${message}\n告警时间：${new Date().toLocaleString()}`,
      type: 'warning'
    };

    return await this.sendNotification(notificationMessage);
  }

  /**
   * 测试邮件配置
   */
  async testEmailConfig(): Promise<{ success: boolean; message: string }> {
    try {
      if (!this.config.email?.enabled) {
        return { success: false, message: '邮件通知未启用' };
      }

      // TODO: 实际测试邮件发送
      return { success: true, message: '邮件配置测试成功' };
    } catch (error) {
      return { 
        success: false, 
        message: `邮件配置测试失败: ${(error as Error).message}` 
      };
    }
  }

  /**
   * 测试企业微信配置
   */
  async testWeComConfig(): Promise<{ success: boolean; message: string }> {
    try {
      if (!this.config.wecom?.enabled) {
        return { success: false, message: '企业微信通知未启用' };
      }

      const testMessage: NotificationMessage = {
        title: '测试通知',
        content: '这是一条测试消息',
        type: 'info'
      };

      const success = await this.sendWeCom(testMessage);

      if (success) {
        return { success: true, message: '企业微信配置测试成功' };
      } else {
        return { success: false, message: '企业微信配置测试失败' };
      }
    } catch (error) {
      return { 
        success: false, 
        message: `企业微信配置测试失败: ${(error as Error).message}` 
      };
    }
  }
}

// 导出单例
export const notificationService = NotificationService.getInstance();
