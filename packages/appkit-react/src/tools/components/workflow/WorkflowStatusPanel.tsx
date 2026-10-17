import React from 'react';
import { AlertCircle } from 'lucide-react';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { type WorkflowActionDefinition, type WorkflowStatusInfo } from './types';

export interface WorkflowStatusPanelProps {
  currentStatus: string;
  onAction?: (action: string) => void;
  actions: WorkflowActionDefinition[];
  statusInfoMap: Record<string, WorkflowStatusInfo>;
  defaultStatusInfo?: WorkflowStatusInfo;
  statusExtraContent?: Partial<Record<string, React.ReactNode>>;
  actionTitle?: string;
  requiredActionTitle?: string;
  requiredActionHint?: string;
}

type ResolvedAction = WorkflowActionDefinition & { enabled: boolean };

function resolveActions(actions: WorkflowActionDefinition[], status: string): ResolvedAction[] {
  return actions.map((action) => ({
    ...action,
    enabled: action.enabledStatuses.includes(status),
  }));
}

const FALLBACK_STATUS_INFO: WorkflowStatusInfo = {
  title: 'Unknown Status',
  description: 'Status metadata is not defined.',
  nextSteps: [],
  color: 'bg-gray-500',
};

/**
 * 申請承認や業務プロセスなどの進捗状況、次に必要なタスク、現在実行可能なアクションを視覚的に表示するワークフローステータスパネルコンポーネント。
 */
export function WorkflowStatusPanel({
  currentStatus,
  onAction,
  actions,
  statusInfoMap,
  defaultStatusInfo = FALLBACK_STATUS_INFO,
  statusExtraContent,
  actionTitle = 'Available Actions',
  requiredActionTitle = 'Required Actions',
  requiredActionHint = 'Please complete the following actions.',
}: WorkflowStatusPanelProps) {
  const statusInfo = statusInfoMap[currentStatus] ?? defaultStatusInfo;
  const resolvedActions = resolveActions(actions, currentStatus);
  const enabledActions = resolvedActions.filter((action) => action.enabled);
  const requiredActions = enabledActions.filter((action) => action.required);
  const extraContent = statusExtraContent?.[currentStatus];

  return (
    <div className='space-y-4'>
      <Card>
        <CardHeader>
          <CardTitle className='flex items-center gap-2'>
            <Badge className={`${statusInfo.color} text-white`}>{currentStatus}</Badge>
            {statusInfo.title}
          </CardTitle>
        </CardHeader>
        <CardContent className='space-y-3'>
          <p className='text-sm text-muted-foreground'>{statusInfo.description}</p>
          {statusInfo.nextSteps.length > 0 ? (
            <div>
              <h4 className='mb-2'>Next Steps</h4>
              <ul className='text-sm space-y-1'>
                {statusInfo.nextSteps.map((step, index) => (
                  <li key={index} className='flex items-center gap-2'>
                    <div className='w-1.5 h-1.5 bg-gray-400 rounded-full' />
                    {step}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
          {requiredActions.length > 0 ? (
            <div className='p-3 bg-amber-50 border border-amber-200 rounded-md'>
              <div className='flex items-center gap-2 text-amber-800'>
                <AlertCircle className='h-4 w-4' />
                <span className='text-sm font-medium'>{requiredActionTitle}</span>
              </div>
              <p className='text-xs text-amber-700 mt-1'>{requiredActionHint}</p>
            </div>
          ) : null}
        </CardContent>
      </Card>

      {enabledActions.length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle className='text-base'>{actionTitle}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3'>
              {enabledActions.map((action) => (
                <Button
                  key={action.action}
                  variant='outline'
                  onClick={() => onAction?.(action.action)}
                  className={`h-auto p-4 justify-start ${action.required ? 'border-amber-300 bg-amber-50' : ''}`}
                >
                  <div className='flex items-center gap-3'>
                    <div className={`p-2 rounded-md ${action.color} text-white`}>{action.icon}</div>
                    <div className='text-left'>
                      <div className='font-medium text-sm'>
                        {action.label}
                        {action.required ? (
                          <Badge variant='destructive' className='ml-2 text-xs'>
                            Required
                          </Badge>
                        ) : null}
                      </div>
                      <div className='text-xs text-muted-foreground'>{action.description}</div>
                    </div>
                  </div>
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>
      ) : null}

      {extraContent ? (
        <Card>
          <CardContent className='pt-6'>{extraContent}</CardContent>
        </Card>
      ) : null}
    </div>
  );
}
