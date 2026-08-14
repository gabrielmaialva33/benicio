import * as React from 'react'
import { cn } from '~/lib/utils'

function Table({ className, ...props }: React.HTMLAttributes<HTMLTableElement>) {
  return (
    <div data-slot="table-wrapper" className="relative w-full overflow-auto">
      <table
        data-slot="table"
        className={cn('w-full caption-bottom text-foreground text-sm', className)}
        {...props}
      />
    </div>
  )
}

function TableHeader({ className, ...props }: React.HTMLAttributes<HTMLTableSectionElement>) {
  return (
    <thead
      data-slot="table-header"
      className={cn('bg-[#f7f8f9] [&_tr]:border-b [&_tr]:border-gray-200', className)}
      {...props}
    />
  )
}

function TableBody({ className, ...props }: React.HTMLAttributes<HTMLTableSectionElement>) {
  return (
    <tbody
      data-slot="table-body"
      className={cn('[&_tr:last-child]:border-0', className)}
      {...props}
    />
  )
}

function TableFooter({ className, ...props }: React.HTMLAttributes<HTMLTableSectionElement>) {
  return (
    <tfoot
      data-slot="table-footer"
      className={cn('border-t bg-muted/50 font-medium last:[&>tr]:border-b-0', className)}
      {...props}
    />
  )
}

function TableRow({ className, ...props }: React.HTMLAttributes<HTMLTableRowElement>) {
  return (
    <tr
      data-slot="table-row"
      className={cn(
        'border-b border-gray-100 transition-colors [&:has(td):hover]:bg-cyan-50/30 data-[state=selected]:bg-cyan-50/40',
        className
      )}
      {...props}
    />
  )
}

function TableHead({ className, ...props }: React.ThHTMLAttributes<HTMLTableCellElement>) {
  return (
    <th
      data-slot="table-head"
      className={cn(
        'h-14 px-5 text-left align-middle text-xs font-semibold uppercase tracking-wide text-gray-500 rtl:text-right [&:has([role=checkbox])]:pe-0',
        className
      )}
      {...props}
    />
  )
}

function TableCell({ className, ...props }: React.TdHTMLAttributes<HTMLTableCellElement>) {
  return (
    <td
      data-slot="table-cell"
      className={cn('px-5 py-4 align-middle [&:has([role=checkbox])]:pe-0', className)}
      {...props}
    />
  )
}

function TableCaption({ className, ...props }: React.HTMLAttributes<HTMLTableCaptionElement>) {
  return (
    <caption
      data-slot="table-caption"
      className={cn('mt-4 text-sm text-muted-foreground', className)}
      {...props}
    />
  )
}

export { Table, TableBody, TableCaption, TableCell, TableFooter, TableHead, TableHeader, TableRow }
