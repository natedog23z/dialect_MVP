interface MetadataProps {
  params: {
    roomId: string;
  };
}

export async function generateMetadata({ params }: MetadataProps) {
  const { roomId } = params;
  return {
    title: `Room ${roomId}`,
  };
} 