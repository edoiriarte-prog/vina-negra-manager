
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import React from 'react';
import { Skeleton } from '@/components/ui/skeleton';

type KpiCardProps = {
  title: string;
  value: string;
  icon: React.ReactNode;
  description: string;
  isLoading?: boolean;
};

export default function KpiCard({
  title,
  value,
  icon,
  description,
  isLoading = false,
}: KpiCardProps) {
  if (isLoading) {
    return (
      <Card className="bg-slate-900 border-slate-800">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
           <Skeleton className="h-5 w-24 bg-slate-700" />
           <Skeleton className="h-6 w-6 rounded-full bg-slate-700" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-8 w-32 bg-slate-700" />
          <Skeleton className="h-3 w-48 mt-2 bg-slate-700" />
        </CardContent>
      </Card>
    );
  }
  
  return (
    <Card className="bg-slate-900 border-slate-800 shadow-sm hover:border-slate-700 transition-all group">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-slate-400 group-hover:text-slate-200 transition-colors">
          {title}
        </CardTitle>
        <div className="p-2 bg-slate-800/50 group-hover:bg-slate-800 rounded-lg border border-slate-700/50 transition-colors">
            {icon}
        </div>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold text-white">{value}</div>
        <p className="text-xs text-muted-foreground h-4">{description}</p>
      </CardContent>
    </Card>
  );
}
