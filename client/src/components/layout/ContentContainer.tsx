import type { ReactNode } from 'react'

interface ContentContainerProps {
  children: ReactNode
  className?: string
}

function ContentContainer({
  children,
  className = '',
}: ContentContainerProps) {
  return (
    <div
      className={`mx-auto w-full max-w-[1600px] px-4 sm:px-6 lg:px-8 ${className}`}
    >
      {children}
    </div>
  )
}

export default ContentContainer