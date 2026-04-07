import React, { useState, useEffect } from 'react';
import { useSettings } from '../contexts/SettingsContext';
import { getArchivedReports } from '../firebase';
import { SavedAIReport } from '../types';
import { Archive, Calendar, FileText, ChevronDown, ChevronUp, Loader2 } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

export function ReportsArchiveView() {
  const { language } = useSettings();
  const [reports, setReports] = useState<SavedAIReport[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    const fetchReports = async () => {
      try {
        const data = await getArchivedReports();
        setReports(data);
      } catch (error) {
        console.error("Failed to fetch reports:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchReports();
  }, []);

  const toggleExpand = (id: string) => {
    setExpandedId(prev => prev === id ? null : id);
  };

  const formatDate = (timestamp: number) => {
    return new Intl.DateTimeFormat(language === 'ru' ? 'ru-RU' : 'en-US', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(new Date(timestamp));
  };

  if (isLoading) {
    return (
      <div className="w-full h-64 flex flex-col items-center justify-center space-y-4">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
        <p className="text-muted-foreground">
          {language === 'ru' ? 'Загрузка архива...' : 'Loading archive...'}
        </p>
      </div>
    );
  }

  if (reports.length === 0) {
    return (
      <div className="w-full h-64 flex flex-col items-center justify-center space-y-4 text-center">
        <div className="w-16 h-16 bg-secondary rounded-full flex items-center justify-center">
          <Archive className="w-8 h-8 text-muted-foreground" />
        </div>
        <div>
          <h3 className="text-h3">
            {language === 'ru' ? 'Архив пуст' : 'Archive is empty'}
          </h3>
          <p className="text-body text-muted-foreground mt-1">
            {language === 'ru' 
              ? 'Сохраненные отчеты будут отображаться здесь' 
              : 'Saved reports will appear here'}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full space-y-6">
      <div className="flex items-center gap-3 mb-8">
        <div className="p-2 bg-primary/10 rounded-xl">
          <Archive className="w-6 h-6 text-primary" />
        </div>
        <h2 className="text-h1">
          {language === 'ru' ? 'Архив отчетов' : 'Reports Archive'}
        </h2>
      </div>

      <div className="space-y-4">
        {reports.map((report) => (
          <div 
            key={report.id}
            className="card-primary overflow-hidden transition-all hover:border-primary/30"
          >
            <button
              onClick={() => toggleExpand(report.id)}
              className="w-full flex items-center justify-between p-5 text-left"
            >
              <div className="flex flex-col md:flex-row md:items-center gap-2 md:gap-6">
                <div className="flex items-center gap-2 text-body font-medium">
                  <FileText className="w-4 h-4 text-primary" />
                  {report.reportType}
                </div>
                
                <div className="flex items-center gap-4 text-caption">
                  <span className="flex items-center gap-1.5">
                    <Calendar className="w-4 h-4" />
                    {report.periodName}
                  </span>
                  <span className="hidden md:inline">•</span>
                  <span>{formatDate(report.date)}</span>
                </div>
              </div>
              
              <div className="p-1 bg-secondary rounded-full text-muted-foreground">
                {expandedId === report.id ? (
                  <ChevronUp className="w-5 h-5" />
                ) : (
                  <ChevronDown className="w-5 h-5" />
                )}
              </div>
            </button>

            {expandedId === report.id && (
              <div className="px-5 pb-5 pt-2 border-t border-border animate-in slide-in-from-top-2 duration-200">
                <div className="markdown-body bg-background/50 p-6 rounded-xl border border-border">
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>{report.content}</ReactMarkdown>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
