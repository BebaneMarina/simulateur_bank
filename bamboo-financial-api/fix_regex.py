#!/usr/bin/env python3
"""
Script pour corriger automatiquement les occurrences de 'pattern=' par 'pattern=' 
dans les fichiers Python utilisant Pydantic v2.
"""
import os
import re
from pathlib import Path

def fix_pydantic_regex(file_path):
    """
    Corrige les occurrences de 'pattern=' par 'pattern=' dans un fichier Python.
    """
    try:
        with open(file_path, 'r', encoding='utf-8') as file:
            content = file.read()
        
        # Compter les occurrences avant correction
        regex_count = content.count('pattern=')
        
        if regex_count == 0:
            print(f"✅ {file_path}: Aucune correction nécessaire")
            return False
        
        # Créer une sauvegarde
        backup_path = str(file_path) + '.backup'
        with open(backup_path, 'w', encoding='utf-8') as backup_file:
            backup_file.write(content)
        
        # Pattern pour remplacer pattern= par pattern= dans les Field()
        pattern = r'\bregex\s*='
        corrected_content = re.sub(pattern, 'pattern=', content)
        
        # Écrire le fichier corrigé
        with open(file_path, 'w', encoding='utf-8') as file:
            file.write(corrected_content)
        
        print(f"✅ {file_path}: {regex_count} correction(s) effectuée(s)")
        print(f"   Sauvegarde créée: {backup_path}")
        return True
        
    except Exception as e:
        print(f"❌ Erreur lors du traitement de {file_path}: {str(e)}")
        return False

def main():
    """
    Fonction principale pour corriger tous les fichiers Python du projet.
    """
    project_root = Path.cwd()
    python_files = list(project_root.glob('**/*.py'))
    
    print(f"🔍 Recherche de fichiers Python dans: {project_root}")
    print(f"📁 {len(python_files)} fichiers Python trouvés")
    print("-" * 50)
    
    fixed_files = 0
    for file_path in python_files:
        # Ignorer les fichiers dans venv, __pycache__, etc.
        if any(ignore in str(file_path) for ignore in ['venv', '__pycache__', '.git', 'node_modules']):
            continue
            
        if fix_pydantic_regex(file_path):
            fixed_files += 1
    
    print("-" * 50)
    print(f"✨ Correction terminée: {fixed_files} fichier(s) modifié(s)")
    
    if fixed_files > 0:
        print("\n⚠️  N'oubliez pas de:")
        print("   1. Vérifier que vos tests passent toujours")
        print("   2. Supprimer les fichiers .backup si tout fonctionne")
        print("   3. Redémarrer votre serveur de développement")

if __name__ == "__main__":
    main()