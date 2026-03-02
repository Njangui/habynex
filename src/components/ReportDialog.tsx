import { useState } from "react";
import { AlertTriangle, Flag, Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useVerification } from "@/hooks/useVerification";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

interface ReportDialogProps {
  userId?: string;
  propertyId?: string;
  trigger?: React.ReactNode;
}

const reportReasons = [
  { value: "fake_listing", label: "Annonce frauduleuse", description: "L'annonce semble fausse ou trompeuse" },
  { value: "fake_photos", label: "Photos non réelles", description: "Les photos ne correspondent pas au logement" },
  { value: "scam", label: "Tentative d'arnaque", description: "Demande d'argent suspecte ou escroquerie" },
  { value: "harassment", label: "Harcèlement", description: "Comportement inapproprié ou harcelant" },
  { value: "fake_identity", label: "Fausse identité", description: "La personne n'est pas qui elle prétend être" },
  { value: "other", label: "Autre", description: "Autre raison de signalement" },
];

export const ReportDialog = ({ userId, propertyId, trigger }: ReportDialogProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const { reportUser } = useVerification();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!reason) {
      toast({
        variant: "destructive",
        title: "Erreur",
        description: "Veuillez sélectionner une raison.",
      });
      return;
    }

    if (!user) {
      toast({
        variant: "destructive",
        title: "Connexion requise",
        description: "Vous devez être connecté pour signaler.",
      });
      return;
    }

    setLoading(true);
    const success = await reportUser(
      userId || null,
      propertyId || null,
      reason,
      description
    );

    if (success) {
      setOpen(false);
      setReason("");
      setDescription("");
    }
    setLoading(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-destructive">
            <Flag className="w-4 h-4 mr-1" />
            Signaler
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-destructive" />
            Signaler un problème
          </DialogTitle>
          <DialogDescription>
            Aidez-nous à maintenir la sécurité de la plateforme en signalant les comportements suspects.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          <div className="space-y-3">
            <Label>Raison du signalement</Label>
            <RadioGroup value={reason} onValueChange={setReason}>
              {reportReasons.map((r) => (
                <label
                  key={r.value}
                  className="flex items-start gap-3 p-3 rounded-lg border border-border hover:bg-muted/50 cursor-pointer transition-colors"
                >
                  <RadioGroupItem value={r.value} className="mt-0.5" />
                  <div>
                    <span className="font-medium text-sm">{r.label}</span>
                    <p className="text-xs text-muted-foreground">{r.description}</p>
                  </div>
                </label>
              ))}
            </RadioGroup>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Détails supplémentaires (optionnel)</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Décrivez le problème en détail..."
              rows={3}
            />
          </div>

          <div className="bg-muted/50 rounded-lg p-3 text-sm text-muted-foreground">
            <p>
              ⚠️ Les faux signalements peuvent entraîner la suspension de votre compte.
              Merci de n'utiliser cette fonction qu'en cas de problème réel.
            </p>
          </div>
        </div>

        <div className="flex gap-2 justify-end">
          <Button variant="outline" onClick={() => setOpen(false)}>
            Annuler
          </Button>
          <Button
            variant="destructive"
            onClick={handleSubmit}
            disabled={loading || !reason}
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
            Envoyer le signalement
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ReportDialog;
