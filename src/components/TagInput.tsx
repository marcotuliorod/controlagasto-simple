import { useState, KeyboardEvent } from "react";
import { X } from "lucide-react";
import { Badge } from "./ui/badge";
import { Input } from "./ui/input";

interface TagInputProps {
  tags: string[];
  onChange: (tags: string[]) => void;
  placeholder?: string;
}

export const TagInput = ({ tags, onChange, placeholder = "Adicionar tag..." }: TagInputProps) => {
  const [inputValue, setInputValue] = useState("");

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      addTag();
    } else if (e.key === "Backspace" && !inputValue && tags.length > 0) {
      removeTag(tags.length - 1);
    }
  };

  const addTag = () => {
    const tag = inputValue.trim().replace(/,/g, "");
    if (tag && !tags.includes(tag)) {
      onChange([...tags, tag]);
      setInputValue("");
    }
  };

  const removeTag = (index: number) => {
    onChange(tags.filter((_, i) => i !== index));
  };

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2 min-h-[2.5rem] p-2 border rounded-md bg-background">
        {tags.map((tag, index) => (
          <Badge key={index} variant="default" className="gap-1">
            {tag}
            <button
              type="button"
              onClick={() => removeTag(index)}
              className="ml-1 hover:bg-muted rounded-full"
            >
              <X className="h-3 w-3" />
            </button>
          </Badge>
        ))}
        <Input
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={handleKeyDown}
          onBlur={addTag}
          placeholder={tags.length === 0 ? placeholder : ""}
          className="flex-1 min-w-[120px] border-none shadow-none focus-visible:ring-0 p-0"
        />
      </div>
      <p className="text-xs text-muted-foreground">
        Pressione Enter ou vírgula para adicionar tags
      </p>
    </div>
  );
};
